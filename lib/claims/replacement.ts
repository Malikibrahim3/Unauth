import type { SupabaseClient } from '@supabase/supabase-js';
import { shopifyAdminOrderHref } from '@/lib/claims/externalAction';

type QueryClient = { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

export type ReplacementSelection = {
  claimed_item_id: string;
  quantity: number;
};

export type ReplacementEligibleItem = {
  claimedItemId: string;
  sourceOrderLineId: string;
  lineExternalId: string;
  sku: string | null;
  variantRef: string | null;
  title: string;
  orderedQuantity: number;
  claimedQuantity: number;
  confirmedReplacementQuantity: number;
  outstandingAuthorisedQuantity: number;
  availableQuantity: number;
  costMinor: number | null;
  costCurrency: string | null;
  costProvenance: 'source_order_line_cost' | 'unavailable';
};

export type ReplacementHandoff = {
  id: string;
  state: string;
  stateVersion: number;
  externalReference: string | null;
  merchantReportedAt: string | null;
  observedSource: string | null;
  observedAt: string | null;
  amountMinor: number | null;
  currency: string | null;
  payload: Record<string, unknown>;
  actualCostMinor: number | null;
  actualCostCurrency: string | null;
  actualCostRecordedAt: string | null;
};

export type ReplacementReadModel = {
  version: 'manual-same-item-replacement-v1';
  ready: boolean;
  unavailableReasons: string[];
  order: {
    id: string;
    externalId: string;
    reference: string;
    currency: string | null;
    internalHref: string;
    providerHref: string | null;
    providerVerified: boolean;
  } | null;
  items: ReplacementEligibleItem[];
  latestHandoff: ReplacementHandoff | null;
};

const CONFIRMED_REPLACEMENT_STATES = new Set([
  'accepted', 'confirmed', 'processing', 'shipped', 'fulfilled', 'delivered',
  'success', 'succeeded', 'complete', 'completed',
]);
const DISPATCHED_ACTION_STATES = new Set([
  'merchant_reported_attempt', 'source_observed_attempt', 'provider_accepted',
  'provider_processing', 'succeeded', 'reconciled',
]);

function clientDb(client: SupabaseClient): QueryClient {
  return client as unknown as QueryClient;
}

function rows(value: unknown): Array<Record<string, any>> {
  return Array.isArray(value) ? value.filter((row) => row && typeof row === 'object') as Array<Record<string, any>> : [];
}

function positiveQuantity(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function replacementSourceQuantity(row: Record<string, any>): number {
  const metadata = row.raw_metadata && typeof row.raw_metadata === 'object' ? row.raw_metadata : {};
  return positiveQuantity(metadata.quantity, 1);
}

function unavailable(reason: string, handoff: ReplacementHandoff | null = null): ReplacementReadModel {
  return {
    version: 'manual-same-item-replacement-v1',
    ready: false,
    unavailableReasons: [reason],
    order: null,
    items: [],
    latestHandoff: handoff,
  };
}

function handoffFromRow(row: Record<string, any> | null): ReplacementHandoff | null {
  if (!row) return null;
  return {
    id: String(row.id),
    state: String(row.action_state ?? 'handoff_ready'),
    stateVersion: positiveQuantity(row.state_version, 1),
    externalReference: typeof row.external_reference === 'string' ? row.external_reference : null,
    merchantReportedAt: typeof row.merchant_reported_at === 'string' ? row.merchant_reported_at : null,
    observedSource: typeof row.observed_source === 'string' ? row.observed_source : null,
    observedAt: typeof row.observed_at === 'string' ? row.observed_at : null,
    amountMinor: Number.isInteger(Number(row.amount_minor)) ? Number(row.amount_minor) : null,
    currency: typeof row.currency === 'string' ? row.currency.toUpperCase() : null,
    payload: row.payload && typeof row.payload === 'object' ? row.payload : {},
    actualCostMinor: null,
    actualCostCurrency: null,
    actualCostRecordedAt: null,
  };
}

/**
 * Server-owned replacement eligibility and handoff projection. Every read is
 * tenant-scoped. Missing P05 schema is a truthful unavailable state, never an
 * empty/zero replacement allowance.
 */
export async function loadReplacementReadModel(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
): Promise<ReplacementReadModel> {
  const db = clientDb(client);
  const { data: handoffRows, error: handoffError } = await db
    .from('connector_action_runs')
    .select('id,action_state,state_version,external_reference,merchant_reported_at,observed_source,observed_at,amount_minor,currency,payload,created_at')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .eq('capability_id', 'replacement.manual_handoff')
    .order('created_at', { ascending: false })
    .limit(1);
  if (handoffError) throw new Error(`replacement_handoff_read_failed:${handoffError.message}`);
  let latestHandoff = handoffFromRow(rows(handoffRows)[0] ?? null);
  if (latestHandoff) {
    const { data: costRows, error: costError } = await db
      .from('case_outcome_events')
      .select('amount_minor,currency,observed_at,metadata')
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', caseId)
      .eq('outcome_type', 'replacement')
      .eq('state', 'merchant_confirmed')
      .order('observed_at', { ascending: false });
    if (costError) throw new Error(`replacement_cost_read_failed:${costError.message}`);
    const cost = rows(costRows).find((row) => row.metadata?.external_action_id === latestHandoff?.id) ?? null;
    if (cost) {
      latestHandoff = {
        ...latestHandoff,
        actualCostMinor: Number.isInteger(Number(cost.amount_minor)) ? Number(cost.amount_minor) : null,
        actualCostCurrency: typeof cost.currency === 'string' ? cost.currency.toUpperCase() : null,
        actualCostRecordedAt: typeof cost.observed_at === 'string' ? cost.observed_at : null,
      };
    }
  }

  const { data: caseRow, error: caseError } = await db
    .from('support_payout_cases')
    .select('id,source_order_id')
    .eq('merchant_id', merchantId)
    .eq('id', caseId)
    .maybeSingle();
  if (caseError) throw new Error(`replacement_case_read_failed:${caseError.message}`);
  if (!caseRow?.source_order_id) return unavailable('A confirmed source order is required.', latestHandoff);

  const { data: order, error: orderError } = await db
    .from('source_orders')
    .select('id,external_id,order_number,source,source_account_id,connection_id,currency')
    .eq('merchant_id', merchantId)
    .eq('id', caseRow.source_order_id)
    .maybeSingle();
  if (orderError) throw new Error(`replacement_order_read_failed:${orderError.message}`);
  if (!order) return unavailable('The confirmed source order is unavailable.', latestHandoff);

  let sourceAccount: Record<string, any> | null = null;
  if (order.source_account_id) {
    const result = await db
      .from('source_accounts')
      .select('id,connection_id,external_account_id,base_url')
      .eq('merchant_id', merchantId)
      .eq('id', order.source_account_id)
      .maybeSingle();
    if (result.error) throw new Error(`replacement_source_account_read_failed:${result.error.message}`);
    sourceAccount = result.data;
  }
  const connectionId = sourceAccount?.connection_id ?? order.connection_id ?? null;
  let connection: Record<string, any> | null = null;
  if (connectionId) {
    const result = await db
      .from('merchant_integrations')
      .select('id,provider_id,provider_account_id,status,last_verification_status')
      .eq('merchant_id', merchantId)
      .eq('id', connectionId)
      .maybeSingle();
    if (result.error) throw new Error(`replacement_connection_read_failed:${result.error.message}`);
    connection = result.data;
  }
  const providerVerified = order.source === 'shopify'
    && connection?.provider_id === 'shopify'
    && connection?.status === 'connected'
    && connection?.last_verification_status === 'verified';
  const providerHref = providerVerified
    ? shopifyAdminOrderHref(
        connection?.provider_account_id ?? sourceAccount?.external_account_id ?? sourceAccount?.base_url,
        String(order.external_id),
      )
    : null;

  const { data: claimedRows, error: claimedError } = await db
    .from('case_claimed_items')
    .select('id,source_order_line_id,claimed_sku,claimed_variant_ref,claimed_title,claimed_quantity')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .eq('match_status', 'confirmed')
    .order('created_at', { ascending: true });
  if (claimedError) throw new Error(`replacement_claimed_items_read_failed:${claimedError.message}`);
  const claimed = rows(claimedRows).filter((item) => typeof item.source_order_line_id === 'string');
  const lineIds = [...new Set(claimed.map((item) => String(item.source_order_line_id)))];
  if (lineIds.length === 0) {
    return {
      ...unavailable('Confirm at least one affected original order line first.', latestHandoff),
      order: {
        id: String(order.id), externalId: String(order.external_id),
        reference: String(order.order_number ?? order.external_id),
        currency: typeof order.currency === 'string' ? order.currency.toUpperCase() : null,
        internalHref: `/orders/${encodeURIComponent(String(order.id))}`,
        providerHref, providerVerified,
      },
    };
  }

  const [lineResult, replacementResult, authorisationResult, decisionResult] = await Promise.all([
    db.from('source_order_lines').select('id,source_order_id,external_id,sku,variant_ref,title,quantity,cost_minor,currency')
      .eq('merchant_id', merchantId).eq('source_order_id', order.id).in('id', lineIds),
    db.from('source_replacements').select('id,source_order_id,original_line_ref,status,source_status,raw_metadata')
      .eq('merchant_id', merchantId).eq('source_order_id', order.id),
    db.from('case_replacement_authorisation_items').select('id,case_decision_id,external_action_id,source_order_line_id,quantity')
      .eq('merchant_id', merchantId).in('source_order_line_id', lineIds),
    db.from('case_decisions').select('id,reverses_decision_id')
      .eq('merchant_id', merchantId),
  ]);
  if (lineResult.error) throw new Error(`replacement_order_lines_read_failed:${lineResult.error.message}`);
  if (replacementResult.error) throw new Error(`replacement_source_rows_read_failed:${replacementResult.error.message}`);
  if (authorisationResult.error) {
    return {
      ...unavailable('Replacement authorisation storage is unavailable; no quantity is assumed.', latestHandoff),
      order: {
        id: String(order.id), externalId: String(order.external_id),
        reference: String(order.order_number ?? order.external_id),
        currency: typeof order.currency === 'string' ? order.currency.toUpperCase() : null,
        internalHref: `/orders/${encodeURIComponent(String(order.id))}`,
        providerHref, providerVerified,
      },
    };
  }
  if (decisionResult.error) throw new Error(`replacement_decisions_read_failed:${decisionResult.error.message}`);

  const authorisations = rows(authorisationResult.data);
  const authorisationIds = authorisations.map((item) => String(item.id));
  const actionIds = [...new Set(authorisations.map((item) => String(item.external_action_id)))];
  const [corroborationResult, actionResult] = await Promise.all([
    authorisationIds.length
      ? db.from('case_replacement_corroborations').select('replacement_authorisation_item_id,quantity')
        .eq('merchant_id', merchantId).in('replacement_authorisation_item_id', authorisationIds)
      : Promise.resolve({ data: [], error: null }),
    actionIds.length
      ? db.from('connector_action_runs').select('id,action_state,merchant_reported_at,observed_at')
        .eq('merchant_id', merchantId).in('id', actionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (corroborationResult.error) throw new Error(`replacement_corroboration_read_failed:${corroborationResult.error.message}`);
  if (actionResult.error) throw new Error(`replacement_actions_read_failed:${actionResult.error.message}`);

  const lineById = new Map(rows(lineResult.data).map((line) => [String(line.id), line]));
  const sourceReplacements = rows(replacementResult.data);
  const reversedIds = new Set(rows(decisionResult.data)
    .map((decision) => decision.reverses_decision_id)
    .filter((id): id is string => typeof id === 'string'));
  const actionById = new Map(rows(actionResult.data).map((action) => [String(action.id), action]));
  const corroboratedByAuthorisation = new Map<string, number>();
  for (const corroboration of rows(corroborationResult.data)) {
    const id = String(corroboration.replacement_authorisation_item_id);
    corroboratedByAuthorisation.set(id, (corroboratedByAuthorisation.get(id) ?? 0) + positiveQuantity(corroboration.quantity));
  }

  const items = claimed.flatMap((item): ReplacementEligibleItem[] => {
    const line = lineById.get(String(item.source_order_line_id));
    if (!line) return [];
    if (item.claimed_sku != null && item.claimed_sku !== line.sku) return [];
    if (item.claimed_variant_ref != null && item.claimed_variant_ref !== line.variant_ref) return [];
    const confirmedReplacementQuantity = sourceReplacements
      .filter((replacement) => replacement.original_line_ref === line.external_id
        && CONFIRMED_REPLACEMENT_STATES.has(String(replacement.source_status ?? replacement.status ?? '').toLowerCase()))
      .reduce((sum, replacement) => sum + replacementSourceQuantity(replacement), 0);
    const outstandingAuthorisedQuantity = authorisations
      .filter((authorised) => authorised.source_order_line_id === line.id)
      .reduce((sum, authorised) => {
        const action = actionById.get(String(authorised.external_action_id));
        const dispatched = Boolean(action?.merchant_reported_at || action?.observed_at
          || DISPATCHED_ACTION_STATES.has(String(action?.action_state ?? '')));
        if (reversedIds.has(String(authorised.case_decision_id)) && !dispatched) return sum;
        return sum + Math.max(
          positiveQuantity(authorised.quantity) - (corroboratedByAuthorisation.get(String(authorised.id)) ?? 0),
          0,
        );
      }, 0);
    const orderedQuantity = positiveQuantity(line.quantity);
    const claimedQuantity = positiveQuantity(item.claimed_quantity);
    const availableQuantity = Math.max(
      Math.min(orderedQuantity, claimedQuantity) - confirmedReplacementQuantity - outstandingAuthorisedQuantity,
      0,
    );
    return [{
      claimedItemId: String(item.id),
      sourceOrderLineId: String(line.id),
      lineExternalId: String(line.external_id),
      sku: typeof line.sku === 'string' ? line.sku : null,
      variantRef: typeof line.variant_ref === 'string' ? line.variant_ref : null,
      title: String(line.title ?? item.claimed_title ?? line.sku ?? 'Original item'),
      orderedQuantity,
      claimedQuantity,
      confirmedReplacementQuantity,
      outstandingAuthorisedQuantity,
      availableQuantity,
      costMinor: Number.isInteger(Number(line.cost_minor)) ? Number(line.cost_minor) : null,
      costCurrency: typeof line.currency === 'string' ? line.currency.toUpperCase() : null,
      costProvenance: Number.isInteger(Number(line.cost_minor)) ? 'source_order_line_cost' : 'unavailable',
    }];
  });

  const unavailableReasons: string[] = [];
  if (!providerVerified) unavailableReasons.push('A connected and verified Shopify account for the original order is required.');
  if (!providerHref) unavailableReasons.push('A safe original-order destination is unavailable.');
  if (!order.currency || !/^[A-Za-z]{3}$/.test(String(order.currency))) unavailableReasons.push('The original order currency is unavailable.');
  if (items.length === 0) unavailableReasons.push('No confirmed item still matches its original order line.');
  if (!items.some((item) => item.availableQuantity > 0)) unavailableReasons.push('No eligible quantity remains after confirmed replacements and outstanding authorisations.');

  return {
    version: 'manual-same-item-replacement-v1',
    ready: unavailableReasons.length === 0,
    unavailableReasons,
    order: {
      id: String(order.id),
      externalId: String(order.external_id),
      reference: String(order.order_number ?? order.external_id),
      currency: typeof order.currency === 'string' ? order.currency.toUpperCase() : null,
      internalHref: `/orders/${encodeURIComponent(String(order.id))}`,
      providerHref,
      providerVerified,
    },
    items,
    latestHandoff,
  };
}

export async function recordSameItemReplacement(
  client: SupabaseClient,
  input: {
    merchantId: string;
    caseId: string;
    expectedVersion: number;
    actorUserId: string;
    idempotencyKey: string;
    budgetMinor: number;
    currency: string;
    reason: string;
    duplicateConcessionJustification?: string | null;
    items: ReplacementSelection[];
    recommendationSnapshot: Record<string, unknown>;
    followedRecommendation: boolean | null;
    relatedSourceObject: Record<string, unknown>;
  },
) {
  const { data, error } = await clientDb(client).rpc('record_same_item_replacement_v1', {
    p_merchant_id: input.merchantId,
    p_case_id: input.caseId,
    p_expected_version: input.expectedVersion,
    p_actor_user_id: input.actorUserId,
    p_idempotency_key: input.idempotencyKey,
    p_budget_minor: input.budgetMinor,
    p_currency: input.currency,
    p_reason: input.reason,
    p_duplicate_concession_justification: input.duplicateConcessionJustification ?? null,
    p_items: input.items,
    p_recommendation_snapshot: input.recommendationSnapshot,
    p_followed_recommendation: input.followedRecommendation,
    p_related_source_object: input.relatedSourceObject,
  });
  if (error) throw new Error(`record same-item replacement failed: ${error.message}`);
  const result = data as Record<string, any>;
  return {
    id: String(result.outcome_id),
    decision_id: String(result.decision_id),
    claim_id: input.caseId,
    decision: 'approved' as const,
    outcome: 'pending' as const,
    amount_minor: input.budgetMinor,
    currency: input.currency.toUpperCase(),
    domain_event_id: typeof result.domain_event_id === 'string' ? result.domain_event_id : null,
    new_version: Number(result.new_version ?? input.expectedVersion + 1),
    replayed: result.replayed === true,
    action: result.action && typeof result.action === 'object' ? result.action as Record<string, unknown> : null,
    replacement_items: Array.isArray(result.replacement_items) ? result.replacement_items : [],
  };
}

export async function reportReplacementDispatch(
  client: SupabaseClient,
  input: {
    merchantId: string;
    actionId: string;
    actorUserId: string;
    expectedVersion: number;
    idempotencyKey: string;
    method: string;
    externalReference?: string | null;
    receiptEvidence?: Record<string, unknown> | null;
  },
) {
  const { data, error } = await clientDb(client).rpc('report_replacement_dispatch_v1', {
    p_merchant_id: input.merchantId,
    p_action_id: input.actionId,
    p_actor_user_id: input.actorUserId,
    p_expected_version: input.expectedVersion,
    p_idempotency_key: input.idempotencyKey,
    p_method: input.method,
    p_external_reference: input.externalReference ?? null,
    p_receipt_evidence: input.receiptEvidence ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { action: Record<string, unknown>; replayed: boolean };
}

export async function corroborateReplacementHandoff(
  client: SupabaseClient,
  input: { merchantId: string; sourceReplacementId: string; observedAt?: string | null },
) {
  const { data, error } = await clientDb(client).rpc('corroborate_replacement_handoff_v1', {
    p_merchant_id: input.merchantId,
    p_source_replacement_id: input.sourceReplacementId,
    p_observed_at: input.observedAt ?? null,
  });
  if (error) throw new Error(`replacement corroboration failed: ${error.message}`);
  return data as { matched: boolean; replayed: boolean; action?: Record<string, unknown>; reason?: string };
}

export async function recordReplacementCost(
  client: SupabaseClient,
  input: {
    merchantId: string;
    caseId: string;
    actionId: string;
    actorUserId: string;
    idempotencyKey: string;
    amountMinor: number;
    currency: string;
    reason: string;
    occurredAt?: string | null;
  },
) {
  const { data, error } = await clientDb(client).rpc('record_replacement_cost_v1', {
    p_merchant_id: input.merchantId,
    p_case_id: input.caseId,
    p_action_id: input.actionId,
    p_actor_user_id: input.actorUserId,
    p_idempotency_key: input.idempotencyKey,
    p_amount_minor: input.amountMinor,
    p_currency: input.currency,
    p_reason: input.reason,
    p_occurred_at: input.occurredAt ?? null,
  });
  if (error) throw new Error(`record replacement cost failed: ${error.message}`);
  return data as { outcome: Record<string, unknown>; financial_entry: Record<string, unknown>; replayed: boolean };
}
