/**
 * Merchant-local customer resolution.
 *
 * This resolver deliberately does not use the global identities/identity_members
 * graph. It keeps observations merchant-scoped, makes weak evidence reversible,
 * and only writes a canonical link when the evidence gate is satisfied.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type MerchantEntityType = 'source_customer' | 'source_order' | 'source_ticket';

export type MerchantCustomerMatchStatus =
  | 'confirmed'
  | 'probable'
  | 'candidate'
  | 'rejected'
  | 'none';

export type MerchantSignal = { type: string; hash: string };

export type MerchantEntityRef = {
  merchantId: string;
  entityType: MerchantEntityType;
  entityId: string;
  source?: string | null;
  sourceAccountKey?: string | null;
  observedAt?: string | null;
  displayName?: string | null;
  email?: string | null;
  rawMetadata?: Record<string, unknown>;
};

export type MerchantEvidenceClassification = {
  status: MerchantCustomerMatchStatus;
  score: number;
  matchedTypes: string[];
  deterministic: boolean;
  independentStrongTypes: string[];
  corroboratingTypes: string[];
  reason: string;
};

export type MerchantCustomerResolution = {
  merchantCustomerId: string | null;
  status: MerchantCustomerMatchStatus;
  score: number;
  reason: string | null;
  candidateIds: string[];
  evidence: MerchantEvidenceClassification[];
};

type Client = SupabaseClient<any>;

const MATCHER_VERSION = 'merchant-local-v1';
const DETERMINISTIC_TYPES = new Set(['platform_customer_id', 'helpdesk_contact_id']);
const STRONG_TYPES = new Set(['email', 'phone', 'payment_token', 'device_token']);
const CORROBORATOR_TYPES = new Set([
  'email_root',
  'shipping_address',
  'billing_address',
  'address_unit',
  'payment_fingerprint',
  'ip',
  'name',
  'postcode',
]);

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function classificationForTypes(types: string[]): MerchantEvidenceClassification {
  const matchedTypes = unique(types);
  const deterministic = matchedTypes.some((type) => DETERMINISTIC_TYPES.has(type));
  const independentStrongTypes = matchedTypes.filter((type) => STRONG_TYPES.has(type));
  const corroboratingTypes = matchedTypes.filter((type) => CORROBORATOR_TYPES.has(type));

  if (deterministic) {
    return {
      status: 'confirmed',
      score: 1,
      matchedTypes,
      deterministic: true,
      independentStrongTypes,
      corroboratingTypes,
      reason: 'same_account_scoped_provider_identifier',
    };
  }
  if (independentStrongTypes.length >= 2) {
    return {
      status: 'confirmed',
      score: 0.95,
      matchedTypes,
      deterministic: false,
      independentStrongTypes,
      corroboratingTypes,
      reason: 'two_independent_strong_signals',
    };
  }
  if (independentStrongTypes.length === 1 && corroboratingTypes.length >= 1) {
    return {
      status: 'probable',
      score: 0.75,
      matchedTypes,
      deterministic: false,
      independentStrongTypes,
      corroboratingTypes,
      reason: 'one_strong_signal_with_corroboration',
    };
  }
  if (independentStrongTypes.length === 1 || corroboratingTypes.length >= 2) {
    return {
      status: 'candidate',
      score: 0.5,
      matchedTypes,
      deterministic: false,
      independentStrongTypes,
      corroboratingTypes,
      reason: independentStrongTypes.length === 1
        ? 'one_strong_signal_only'
        : 'corroboration_only',
    };
  }
  return {
    status: 'none',
    score: 0,
    matchedTypes,
    deterministic: false,
    independentStrongTypes,
    corroboratingTypes,
    reason: 'insufficient_identity_evidence',
  };
}

/** Exported for deterministic unit tests and offline matcher evaluation. */
export function classifyMerchantEvidence(types: string[]): MerchantEvidenceClassification {
  return classificationForTypes(types);
}

function tableForEntity(entityType: MerchantEntityType): string {
  if (entityType === 'source_customer') return TABLES.SOURCE_CUSTOMERS;
  if (entityType === 'source_ticket') return TABLES.SOURCE_TICKETS;
  return TABLES.SOURCE_ORDERS;
}

function relationLabel(entityType: MerchantEntityType): string {
  return entityType === 'source_customer'
    ? 'customer'
    : entityType === 'source_ticket'
      ? 'ticket'
      : 'order';
}

async function loadCurrentMerchantCustomer(
  client: Client,
  entity: MerchantEntityRef,
): Promise<string | null> {
  const table = tableForEntity(entity.entityType);
  const { data, error } = await client
    .from(table)
    .select('merchant_customer_id, source_customer_id')
    .eq('merchant_id', entity.merchantId)
    .eq('id', entity.entityId)
    .maybeSingle();
  // Keep ingestion best-effort while the additive migration is rolling out.
  // Orders and tickets did not have merchant_customer_id on older deployments.
  if (error) {
    const legacy = await client
      .from(table)
      .select('source_customer_id')
      .eq('merchant_id', entity.merchantId)
      .eq('id', entity.entityId)
      .maybeSingle();
    if (legacy.error || entity.entityType === 'source_customer' || !legacy.data?.source_customer_id) {
      return null;
    }
    const { data: customer } = await client
      .from(TABLES.SOURCE_CUSTOMERS)
      .select('merchant_customer_id')
      .eq('merchant_id', entity.merchantId)
      .eq('id', legacy.data.source_customer_id as string)
      .maybeSingle();
    return (customer?.merchant_customer_id as string | null | undefined) ?? null;
  }
  if (!error && data?.merchant_customer_id) return data.merchant_customer_id as string;
  if (entity.entityType === 'source_order' || entity.entityType === 'source_ticket') {
    const sourceCustomerId = data?.source_customer_id as string | null | undefined;
    if (sourceCustomerId) {
      const { data: customer } = await client
        .from(TABLES.SOURCE_CUSTOMERS)
        .select('merchant_customer_id')
        .eq('merchant_id', entity.merchantId)
        .eq('id', sourceCustomerId)
        .maybeSingle();
      return (customer?.merchant_customer_id as string | null | undefined) ?? null;
    }
  }
  return null;
}

async function createMerchantCustomer(
  client: Client,
  entity: MerchantEntityRef,
): Promise<string> {
  const { data, error } = await client
    .from(TABLES.MERCHANT_CUSTOMERS)
    .insert({
      merchant_id: entity.merchantId,
      display_name: entity.displayName ?? null,
      email: entity.email ?? null,
      matcher_version: MATCHER_VERSION,
      last_resolved_at: entity.observedAt ?? new Date().toISOString(),
      raw_metadata: {
        created_by: 'merchant_local_resolver',
        first_entity_type: entity.entityType,
        first_entity_id: entity.entityId,
        ...(entity.rawMetadata ?? {}),
      },
    })
    .select('id')
    .single();
  if (error || !data?.id) {
    throw new Error(`merchant_customer_create_failed: ${error?.message ?? 'missing_id'}`);
  }
  return data.id as string;
}

async function linkEntity(
  client: Client,
  entity: MerchantEntityRef,
  merchantCustomerId: string,
): Promise<void> {
  const { error } = await client
    .from(tableForEntity(entity.entityType))
    .update({ merchant_customer_id: merchantCustomerId, updated_at: new Date().toISOString() })
    .eq('merchant_id', entity.merchantId)
    .eq('id', entity.entityId);
  if (error) throw new Error(`merchant_customer_${relationLabel(entity.entityType)}_link_failed: ${error.message}`);
}

async function upsertCandidate(
  client: Client,
  entity: MerchantEntityRef,
  candidateId: string,
  classification: MerchantEvidenceClassification,
): Promise<string | null> {
  const { data: existing } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .select('id, status')
    .eq('merchant_id', entity.merchantId)
    .eq('subject_entity_type', entity.entityType)
    .eq('subject_entity_id', entity.entityId)
    .eq('candidate_entity_type', 'merchant_customer')
    .eq('candidate_entity_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.status === 'rejected') return existing.id as string;
  const payload = {
    merchant_id: entity.merchantId,
    subject_entity_type: entity.entityType,
    subject_entity_id: entity.entityId,
    candidate_entity_type: 'merchant_customer',
    candidate_entity_id: candidateId,
    match_method: 'merchant_local_identity',
    confidence: classification.score,
    status: existing?.status ?? 'open',
    evidence: {
      matcher_version: MATCHER_VERSION,
      status: classification.status,
      reason: classification.reason,
      matched_types: classification.matchedTypes,
      independent_strong_types: classification.independentStrongTypes,
      corroborating_types: classification.corroboratingTypes,
    },
  };

  if (existing?.id) {
    const { error } = await client
      .from(TABLES.RECORD_MATCH_CANDIDATES)
      .update(payload)
      .eq('id', existing.id);
    if (error) throw new Error(`merchant_match_candidate_update_failed: ${error.message}`);
    return existing.id as string;
  }
  const { data, error } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(`merchant_match_candidate_insert_failed: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}

async function recordSelection(
  client: Client,
  entity: MerchantEntityRef,
  candidateId: string,
  candidateRowId: string | null,
  classification: MerchantEvidenceClassification,
): Promise<void> {
  if (candidateRowId) {
    await client
      .from(TABLES.RECORD_MATCH_CANDIDATES)
      .update({ status: 'selected' })
      .eq('id', candidateRowId);
  }
  const { error } = await client.from(TABLES.RECORD_MATCH_RESOLUTIONS).insert({
    merchant_id: entity.merchantId,
    subject_entity_type: entity.entityType,
    subject_entity_id: entity.entityId,
    selected_candidate_id: candidateRowId,
    prior_status: 'open',
    new_status: 'selected',
    reason: classification.reason,
    resolved_at: new Date().toISOString(),
    metadata: {
      matcher_version: MATCHER_VERSION,
      candidate_entity_type: 'merchant_customer',
      candidate_entity_id: candidateId,
      evidence: classification,
    },
  });
  if (error) throw new Error(`merchant_match_resolution_insert_failed: ${error.message}`);
}

async function mergeMerchantCustomers(
  client: Client,
  merchantId: string,
  fromId: string,
  toId: string,
): Promise<void> {
  if (fromId === toId) return;
  const childTables = [
    TABLES.SOURCE_CUSTOMERS,
    TABLES.SOURCE_ORDERS,
    TABLES.SOURCE_TICKETS,
    TABLES.MERCHANT_CLAIMS,
  ];
  for (const table of childTables) {
    const { error } = await client
      .from(table)
      .update({ merchant_customer_id: toId, updated_at: new Date().toISOString() })
      .eq('merchant_id', merchantId)
      .eq('merchant_customer_id', fromId);
    if (error) throw new Error(`merchant_customer_merge_${table}_failed: ${error.message}`);
  }

  const { data: oldSignals, error: signalError } = await client
    .from(TABLES.MERCHANT_CUSTOMER_SIGNALS)
    .select('identifier_type, identifier_hash, source_entity_type, source_entity_id, first_seen_at, last_seen_at, seen_count, evidence')
    .eq('merchant_id', merchantId)
    .eq('merchant_customer_id', fromId);
  if (signalError) throw new Error(`merchant_customer_merge_signal_lookup_failed: ${signalError.message}`);
  if (oldSignals?.length) {
    const rows = oldSignals.map((row: Record<string, unknown>) => ({
      merchant_id: merchantId,
      merchant_customer_id: toId,
      ...row,
    }));
    const { error } = await client
      .from(TABLES.MERCHANT_CUSTOMER_SIGNALS)
      .upsert(rows, {
        onConflict: 'merchant_customer_id,identifier_type,identifier_hash,source_entity_type,source_entity_id',
      });
    if (error) throw new Error(`merchant_customer_merge_signal_upsert_failed: ${error.message}`);
    const { error: deleteError } = await client
      .from(TABLES.MERCHANT_CUSTOMER_SIGNALS)
      .delete()
      .eq('merchant_id', merchantId)
      .eq('merchant_customer_id', fromId);
    if (deleteError) throw new Error(`merchant_customer_merge_signal_delete_failed: ${deleteError.message}`);
  }

  await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .update({ status: 'superseded' })
    .eq('merchant_id', merchantId)
    .eq('candidate_entity_type', 'merchant_customer')
    .eq('candidate_entity_id', fromId)
    .eq('status', 'open');

  const { error: supersedeError } = await client
    .from(TABLES.MERCHANT_CUSTOMERS)
    .update({
      resolution_status: 'superseded',
      superseded_by: toId,
      matcher_version: MATCHER_VERSION,
      last_resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId)
    .eq('id', fromId);
  if (supersedeError) throw new Error(`merchant_customer_supersede_failed: ${supersedeError.message}`);
}

async function syncSignals(
  client: Client,
  entity: MerchantEntityRef,
  merchantCustomerId: string,
  signals: MerchantSignal[],
): Promise<void> {
  if (signals.length === 0) return;
  const types = unique(signals.map((signal) => signal.type));
  const hashes = unique(signals.map((signal) => signal.hash));
  const { data: existing, error: existingError } = await client
    .from(TABLES.MERCHANT_CUSTOMER_SIGNALS)
    .select('identifier_type, identifier_hash, first_seen_at, seen_count')
    .eq('merchant_id', entity.merchantId)
    .eq('merchant_customer_id', merchantCustomerId)
    .eq('source_entity_type', entity.entityType)
    .eq('source_entity_id', entity.entityId)
    .in('identifier_type', types)
    .in('identifier_hash', hashes);
  if (existingError) throw new Error(`merchant_customer_signal_lookup_failed: ${existingError.message}`);
  const existingByKey = new Map(
    (existing ?? []).map((row: Record<string, unknown>) => [
      `${row.identifier_type}|${row.identifier_hash}`,
      row,
    ]),
  );
  const now = new Date().toISOString();
  const rows = signals.map((signal) => ({
    merchant_id: entity.merchantId,
    merchant_customer_id: merchantCustomerId,
    identifier_type: signal.type,
    identifier_hash: signal.hash,
    source_entity_type: entity.entityType,
    source_entity_id: entity.entityId,
    first_seen_at: existingByKey.get(`${signal.type}|${signal.hash}`)?.first_seen_at
      ?? entity.observedAt
      ?? now,
    last_seen_at: entity.observedAt ?? now,
    seen_count: Number(existingByKey.get(`${signal.type}|${signal.hash}`)?.seen_count ?? 0) + 1,
    evidence: {
      matcher_version: MATCHER_VERSION,
      source: entity.source ?? null,
      source_account_key: entity.sourceAccountKey ?? null,
    },
  }));
  const { error } = await client
    .from(TABLES.MERCHANT_CUSTOMER_SIGNALS)
    .upsert(rows, {
      onConflict: 'merchant_customer_id,identifier_type,identifier_hash,source_entity_type,source_entity_id',
    });
  if (error) throw new Error(`merchant_customer_signal_upsert_failed: ${error.message}`);
}

async function loadCandidates(
  client: Client,
  entity: MerchantEntityRef,
  signals: MerchantSignal[],
  currentId: string | null,
): Promise<Array<{ id: string; classification: MerchantEvidenceClassification }>> {
  if (signals.length === 0) return [];
  const hashes = unique(signals.map((signal) => signal.hash));
  const types = unique(signals.map((signal) => signal.type));
  const wanted = new Set(signals.map((signal) => `${signal.type}|${signal.hash}`));
  const { data, error } = await client
    .from(TABLES.MERCHANT_CUSTOMER_SIGNALS)
    .select('merchant_customer_id, identifier_type, identifier_hash')
    .eq('merchant_id', entity.merchantId)
    .in('identifier_type', types)
    .in('identifier_hash', hashes);
  if (error) throw new Error(`merchant_customer_candidate_lookup_failed: ${error.message}`);

  const byCustomer = new Map<string, string[]>();
  for (const row of data ?? []) {
    const key = `${row.identifier_type}|${row.identifier_hash}`;
    if (!wanted.has(key)) continue;
    const customerId = row.merchant_customer_id as string;
    if (customerId === currentId) continue;
    const typesForCustomer = byCustomer.get(customerId) ?? [];
    typesForCustomer.push(row.identifier_type as string);
    byCustomer.set(customerId, typesForCustomer);
  }

  return [...byCustomer.entries()]
    .map(([id, matchedTypes]) => ({ id, classification: classificationForTypes(matchedTypes) }))
    .filter((candidate) => candidate.classification.status !== 'none')
    .sort((a, b) => b.classification.score - a.classification.score);
}

/**
 * Resolve one source entity into the merchant-local canonical customer model.
 * Probable/candidate matches are persisted for review but never merged.
 */
export async function resolveMerchantCustomer(
  client: Client,
  entity: MerchantEntityRef,
  signals: MerchantSignal[],
): Promise<MerchantCustomerResolution> {
  const currentId = await loadCurrentMerchantCustomer(client, entity);
  const candidates = await loadCandidates(client, entity, signals, currentId);

  const confirmed = candidates.find((candidate) => candidate.classification.status === 'confirmed');
  const candidateRows = new Map<string, string | null>();
  for (const candidate of candidates) {
    candidateRows.set(
      candidate.id,
      await upsertCandidate(client, entity, candidate.id, candidate.classification),
    );
  }

  let merchantCustomerId = currentId;
  if (!merchantCustomerId) {
    merchantCustomerId = await createMerchantCustomer(client, entity);
  }

  if (confirmed && confirmed.id !== merchantCustomerId) {
    await recordSelection(client, entity, confirmed.id, candidateRows.get(confirmed.id) ?? null, confirmed.classification);
    await mergeMerchantCustomers(client, entity.merchantId, merchantCustomerId, confirmed.id);
    merchantCustomerId = confirmed.id;
  }

  // Orders/tickets may inherit currentId from their parent source_customer
  // without their own row carrying the FK yet — always write the final link.
  await linkEntity(client, entity, merchantCustomerId);

  await syncSignals(client, entity, merchantCustomerId, signals);
  await client
    .from(TABLES.MERCHANT_CUSTOMERS)
    .update({
      display_name: entity.displayName ?? undefined,
      email: entity.email ?? undefined,
      matcher_version: MATCHER_VERSION,
      last_resolved_at: entity.observedAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', entity.merchantId)
    .eq('id', merchantCustomerId);

  if (confirmed) {
    return {
      merchantCustomerId,
      status: 'confirmed',
      score: confirmed.classification.score,
      reason: confirmed.classification.reason,
      candidateIds: candidates.map((candidate) => candidate.id),
      evidence: candidates.map((candidate) => candidate.classification),
    };
  }

  const best = candidates[0]?.classification;
  return {
    merchantCustomerId,
    status: best?.status ?? 'none',
    score: best?.score ?? 0,
    reason: best?.reason ?? null,
    candidateIds: candidates.map((candidate) => candidate.id),
    evidence: candidates.map((candidate) => candidate.classification),
  };
}

/** Re-attach a case to the canonical customer through its order or ticket. */
export async function syncPayoutCaseMerchantCustomer(
  client: Client,
  merchantId: string,
  claimId: string,
): Promise<string | null> {
  const { data: claim, error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('merchant_customer_id, source_order_id, source_ticket_id')
    .eq('merchant_id', merchantId)
    .eq('id', claimId)
    .maybeSingle();
  if (error || !claim) return null;
  if (claim.merchant_customer_id) return claim.merchant_customer_id as string;

  let customerId: string | null = null;
  if (claim.source_order_id) {
    const { data: order } = await client
      .from(TABLES.SOURCE_ORDERS)
      .select('merchant_customer_id, source_customer_id')
      .eq('merchant_id', merchantId)
      .eq('id', claim.source_order_id)
      .maybeSingle();
    customerId = (order?.merchant_customer_id as string | null | undefined) ?? null;
    if (!customerId && order?.source_customer_id) {
      const { data: sourceCustomer } = await client
        .from(TABLES.SOURCE_CUSTOMERS)
        .select('merchant_customer_id')
        .eq('merchant_id', merchantId)
        .eq('id', order.source_customer_id)
        .maybeSingle();
      customerId = (sourceCustomer?.merchant_customer_id as string | null | undefined) ?? null;
    }
  }
  if (!customerId && claim.source_ticket_id) {
    const { data: ticket } = await client
      .from(TABLES.SOURCE_TICKETS)
      .select('merchant_customer_id, source_customer_id')
      .eq('merchant_id', merchantId)
      .eq('id', claim.source_ticket_id)
      .maybeSingle();
    customerId = (ticket?.merchant_customer_id as string | null | undefined) ?? null;
    if (!customerId && ticket?.source_customer_id) {
      const { data: sourceCustomer } = await client
        .from(TABLES.SOURCE_CUSTOMERS)
        .select('merchant_customer_id')
        .eq('merchant_id', merchantId)
        .eq('id', ticket.source_customer_id)
        .maybeSingle();
      customerId = (sourceCustomer?.merchant_customer_id as string | null | undefined) ?? null;
    }
  }
  if (!customerId) return null;
  const { error: updateError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .update({ merchant_customer_id: customerId, updated_at: new Date().toISOString() })
    .eq('merchant_id', merchantId)
    .eq('id', claimId);
  if (updateError) throw new Error(`merchant_customer_case_link_failed: ${updateError.message}`);
  return customerId;
}

export async function syncPayoutCasesForOrder(
  client: Client,
  merchantId: string,
  sourceOrderId: string,
): Promise<void> {
  const { data: cases, error } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('source_order_id', sourceOrderId);
  if (error) throw new Error(`merchant_customer_case_lookup_failed: ${error.message}`);
  for (const row of cases ?? []) {
    await syncPayoutCaseMerchantCustomer(client, merchantId, row.id as string);
  }
}
