import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import {
  buildItemParcelMatrix,
  evaluateReconciliation,
} from './recommendations';
import type {
  ReconciliationClaimedItem,
  ReconciliationFact,
  ReconciliationInput,
  ReconciliationParcel,
  ReconciliationRecommendation,
  ReconciliationRecommendationSnapshot,
  ReconciliationShipmentLine,
} from './types';

type UntypedQueryClient = {
  from: (table: string) => any;
};

function db(client: SupabaseClient): UntypedQueryClient {
  return client as unknown as UntypedQueryClient;
}

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function rows(value: unknown): Record<string, any>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type EvidenceLink = {
  evidence_item_id?: string | null;
  case_claimed_item_id?: string | null;
  source_order_line_id?: string | null;
  source_shipment_id?: string | null;
  source_shipment_line_id?: string | null;
};

function asFact(
  row: Record<string, any>,
  link?: EvidenceLink,
  shipmentIdForLine?: string | null,
): ReconciliationFact {
  const value = { ...record(row.structured_value) };
  if (link?.case_claimed_item_id && !value.case_claimed_item_id) value.case_claimed_item_id = link.case_claimed_item_id;
  if (link?.source_order_line_id && !value.source_order_line_id) value.source_order_line_id = link.source_order_line_id;
  if (link?.source_shipment_id && !value.source_shipment_id) value.source_shipment_id = link.source_shipment_id;
  if (link?.source_shipment_line_id && !value.source_shipment_line_id) value.source_shipment_line_id = link.source_shipment_line_id;
  if (shipmentIdForLine && !value.source_shipment_id) value.source_shipment_id = shipmentIdForLine;
  return {
    id: String(row.id),
    factKind: row.fact_kind === 'human_finding' || row.fact_kind === 'inference' ? row.fact_kind : 'source_fact',
    evidenceType: String(row.evidence_type ?? 'unknown'),
    sourceProvider: String(row.source_system ?? 'unknown'),
    externalReference: stringOrNull(row.external_reference ?? row.source_metadata?.external_reference),
    occurredAt: stringOrNull(row.occurred_at ?? row.source_created_at),
    collectedAt: stringOrNull(row.ingested_at ?? row.created_at),
    freshness: row.freshness_state ?? 'unknown',
    summary: stringOrNull(row.summary),
    sourceOrderLineId: stringOrNull(value.source_order_line_id),
    sourceShipmentId: stringOrNull(value.source_shipment_id),
    sourceShipmentLineId: stringOrNull(value.source_shipment_line_id),
    claimedItemId: stringOrNull(value.case_claimed_item_id),
    supports: Array.isArray(value.supports) ? value.supports.filter((id): id is string => typeof id === 'string') : [],
    conflicts: Array.isArray(value.conflicts) ? value.conflicts.filter((id): id is string => typeof id === 'string') : [],
    value,
  };
}

function asClaimedItem(row: Record<string, any>): ReconciliationClaimedItem {
  return {
    id: String(row.id),
    sku: stringOrNull(row.claimed_sku),
    variantRef: stringOrNull(row.claimed_variant_ref),
    title: stringOrNull(row.claimed_title),
    quantity: Math.max(1, Math.floor(numberOrZero(row.claimed_quantity) || 1)),
    sourceOrderLineId: stringOrNull(row.source_order_line_id),
    matchStatus: row.match_status ?? 'unmatched',
  };
}

function asShipmentLine(row: Record<string, any>): ReconciliationShipmentLine {
  return {
    id: String(row.id),
    shipmentId: String(row.source_shipment_id),
    sourceOrderLineId: stringOrNull(row.source_order_line_id),
    sku: stringOrNull(row.sku),
    variantRef: stringOrNull(row.variant_ref),
    quantityRecorded: Math.max(0, Math.floor(numberOrZero(row.quantity_recorded))),
    recordKind: String(row.record_kind ?? 'system_record'),
    evidenceBasis: String(row.evidence_basis ?? 'system_record'),
  };
}

function rawShipmentLines(
  shipmentId: string,
  raw: Record<string, any>,
): ReconciliationShipmentLine[] {
  const candidates = [raw.line_items, raw.items, raw.products, raw.contents]
    .find((value) => Array.isArray(value)) as unknown[] | undefined;
  if (!candidates) return [];
  return candidates.flatMap((candidate, index) => {
    const line = record(candidate);
    const quantity = Number(line.quantity ?? line.quantity_recorded ?? line.fulfillable_quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return [];
    return [{
      id: `${shipmentId}:raw:${index}`,
      shipmentId,
      sourceOrderLineId: stringOrNull(line.source_order_line_id ?? line.order_line_id ?? line.line_id),
      sku: stringOrNull(line.sku ?? line.product_sku ?? line.variant_sku),
      variantRef: stringOrNull(line.variant_ref ?? line.variant_id ?? line.variantRef),
      quantityRecorded: Math.floor(quantity),
      recordKind: 'system_record',
      evidenceBasis: 'system_record',
    } satisfies ReconciliationShipmentLine];
  });
}

function asParcel(row: Record<string, any>, lineRows: Record<string, any>[]): ReconciliationParcel {
  const raw = record(row.raw_metadata);
  const exception = stringOrNull(
    row.exception ?? (row.source_status === 'exception' ? row.source_status : null),
  );
  const persistedLines = lineRows
    .filter((line) => line.source_shipment_id === row.id)
    .map(asShipmentLine);
  return {
    id: String(row.id),
    trackingNumber: stringOrNull(row.tracking_number),
    carrier: stringOrNull(row.carrier),
    status: stringOrNull(row.status ?? row.source_status),
    shippedAt: stringOrNull(row.shipped_at),
    deliveredAt: stringOrNull(row.delivered_at),
    estimatedDeliveryAt: stringOrNull(row.estimated_delivery_at ?? raw.estimated_delivery_at),
    sourceProvider: stringOrNull(row.source_provider ?? raw.source_provider),
    exception,
    // Older connector rows may have line data only inside raw_metadata. Keep
    // that data explicitly labelled as a provider system record; it is useful
    // for SKU/parcel matching but never counts as physical pack proof.
    shipmentLines: persistedLines.length > 0 ? persistedLines : rawShipmentLines(String(row.id), raw),
  };
}

function snapshotRow(
  caseId: string,
  merchantId: string,
  recommendation: ReconciliationRecommendation,
  inputHash: string,
  supersedesSnapshotId: string | null,
) {
  return {
    merchant_id: merchantId,
    support_payout_case_id: caseId,
    recommendation_type: recommendation.recommendationType,
    result_code: recommendation.resultCode,
    assessment_state: recommendation.assessmentState,
    headline: recommendation.headline,
    explanation: recommendation.explanation,
    reason_codes: recommendation.reasonCodes,
    supporting_evidence_ids: recommendation.supportingEvidenceIds,
    conflicting_evidence_ids: recommendation.conflictingEvidenceIds,
    missing_evidence: recommendation.missingEvidence,
    recheck_at: recommendation.recheckAt ?? null,
    merchant_rule_version_id: recommendation.policyVersionId ?? null,
    partner_recovery_rule_version_id: recommendation.contractVersionId ?? null,
    policy_snapshot: recommendation.policySnapshot ?? {},
    input_hash: inputHash,
    engine_version: recommendation.engineVersion,
    supersedes_snapshot_id: supersedesSnapshotId,
    generated_at: recommendation.generatedAt,
    generated_by: 'system:reconciliation',
    metadata: {},
  };
}

async function latestSnapshot(
  client: UntypedQueryClient,
  merchantId: string,
  caseId: string,
  recommendationType: string,
): Promise<Record<string, any> | null> {
  const result = await client
    .from(TABLES.CASE_RECOMMENDATION_SNAPSHOTS)
    .select('id,input_hash,generated_at')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .eq('recommendation_type', recommendationType)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(`reconciliation_latest_snapshot_failed: ${result.error.message}`);
  return result.data ? record(result.data) : null;
}

async function appendSnapshot(
  client: UntypedQueryClient,
  merchantId: string,
  caseId: string,
  recommendation: ReconciliationRecommendation,
  inputHash: string,
): Promise<ReconciliationRecommendationSnapshot> {
  const existing = await latestSnapshot(client, merchantId, caseId, recommendation.recommendationType);
  if (existing?.input_hash === inputHash) {
    return { ...recommendation, id: String(existing.id), caseId, inputHash, supersedesSnapshotId: null };
  }

  const result = await client
    .from(TABLES.CASE_RECOMMENDATION_SNAPSHOTS)
    .insert(snapshotRow(caseId, merchantId, recommendation, inputHash, existing?.id ? String(existing.id) : null))
    .select('id')
    .single();
  if (result.error) throw new Error(`reconciliation_snapshot_insert_failed: ${result.error.message}`);
  return {
    ...recommendation,
    id: String(result.data.id),
    caseId,
    inputHash,
    supersedesSnapshotId: existing?.id ? String(existing.id) : null,
  };
}

export async function buildReconciliationInput(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
  now?: string,
): Promise<ReconciliationInput | null> {
  const query = db(client);
  const caseResult = await query
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,merchant_id,claim_type,reason_normalized,requested_action,source_order_id,source_ticket_id,identity_id')
    .eq('merchant_id', merchantId)
    .eq('id', caseId)
    .maybeSingle();
  if (caseResult.error) throw new Error(`reconciliation_case_lookup_failed: ${caseResult.error.message}`);
  if (!caseResult.data) return null;
  const caseRow = record(caseResult.data);

  const [claimedResult, parcelResult, factsResult, linksResult] = await Promise.all([
    query.from(TABLES.CASE_CLAIMED_ITEMS)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', caseId)
      .order('created_at', { ascending: true }),
    caseRow.source_order_id
      ? query.from(TABLES.SOURCE_SHIPMENTS)
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('source_order_id', caseRow.source_order_id)
        .order('shipped_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    query.from(TABLES.EVIDENCE_ITEMS)
      .select('id,evidence_type,fact_kind,external_reference,source_system,source_metadata,structured_value,summary,occurred_at,source_created_at,ingested_at,created_at,freshness_state')
      .eq('merchant_id', merchantId)
      .eq('claim_id', caseId)
      .order('occurred_at', { ascending: true, nullsFirst: false }),
    query.from(TABLES.EVIDENCE_LINKS)
      .select('evidence_item_id,case_claimed_item_id,source_order_line_id,source_shipment_id,source_shipment_line_id')
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', caseId),
  ]);
  if (claimedResult.error) throw new Error(`reconciliation_claimed_items_failed: ${claimedResult.error.message}`);
  if (parcelResult.error) throw new Error(`reconciliation_parcels_failed: ${parcelResult.error.message}`);
  if (factsResult.error) throw new Error(`reconciliation_facts_failed: ${factsResult.error.message}`);
  if (linksResult.error) throw new Error(`reconciliation_evidence_links_failed: ${linksResult.error.message}`);

  const parcelRows = rows(parcelResult.data);
  const shipmentIds = parcelRows.map((row) => row.id).filter(Boolean);
  const lineResult = shipmentIds.length > 0
    ? await query.from(TABLES.SOURCE_SHIPMENT_LINES)
      .select('*')
      .eq('merchant_id', merchantId)
      .in('source_shipment_id', shipmentIds)
    : { data: [], error: null };
  if (lineResult.error) throw new Error(`reconciliation_shipment_lines_failed: ${lineResult.error.message}`);

  const lineRows = rows(lineResult.data);
  const shipmentIdByLineId = new Map(
    lineRows
      .filter((line) => line.id && line.source_shipment_id)
      .map((line) => [String(line.id), String(line.source_shipment_id)]),
  );
  const linkByEvidenceId = new Map<string, EvidenceLink>();
  for (const link of rows(linksResult.data)) {
    if (link.evidence_item_id && !linkByEvidenceId.has(String(link.evidence_item_id))) {
      linkByEvidenceId.set(String(link.evidence_item_id), link);
    }
  }
  const claimedItems = rows(claimedResult.data).map(asClaimedItem);
  const parcels = parcelRows.map((row) => asParcel(row, lineRows));
  const facts = rows(factsResult.data).map((row) => {
    const link = linkByEvidenceId.get(String(row.id));
    const shipmentIdForLine = link?.source_shipment_line_id
      ? shipmentIdByLineId.get(String(link.source_shipment_line_id)) ?? null
      : null;
    return asFact(row, link, shipmentIdForLine);
  });

  return {
    claimType: caseRow.reason_normalized ?? caseRow.claim_type ?? null,
    requestedAction: caseRow.requested_action ?? null,
    identityConfirmed: Boolean(caseRow.source_ticket_id || caseRow.identity_id),
    orderConfirmed: Boolean(caseRow.source_order_id && claimedItems.some((item) => item.matchStatus === 'confirmed')),
    claimedItems,
    parcels,
    facts,
    now,
  };
}

export async function refreshCaseReconciliation(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
  options?: { now?: string },
) {
  const input = await buildReconciliationInput(client, merchantId, caseId, options?.now);
  if (!input) return null;
  const evaluation = evaluateReconciliation(input);
  const query = db(client);
  const snapshots = await Promise.all([
    appendSnapshot(query, merchantId, caseId, evaluation.recommendations.customerAction, evaluation.inputHash),
    appendSnapshot(query, merchantId, caseId, evaluation.recommendations.responsibility, evaluation.inputHash),
    appendSnapshot(query, merchantId, caseId, evaluation.recommendations.recovery, evaluation.inputHash),
  ]);
  return {
    input,
    matrix: evaluation.matrix,
    inputHash: evaluation.inputHash,
    recommendations: {
      customerAction: snapshots[0],
      responsibility: snapshots[1],
      recovery: snapshots[2],
    },
  };
}

export async function getReconciliationReadModel(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
) {
  const input = await buildReconciliationInput(client, merchantId, caseId);
  if (!input) return null;
  const query = db(client);
  const [snapshotResult, claimedResult, parcelResult, outcomesResult, creditsResult] = await Promise.all([
    query.from(TABLES.CASE_RECOMMENDATION_SNAPSHOTS)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', caseId)
      .order('generated_at', { ascending: false }),
    query.from(TABLES.CASE_CLAIMED_ITEMS)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', caseId)
      .order('created_at', { ascending: true }),
    input.parcels.length > 0
      ? query.from(TABLES.SOURCE_SHIPMENT_LINES)
        .select('*')
        .eq('merchant_id', merchantId)
        .in('source_shipment_id', input.parcels.map((parcel) => parcel.id))
      : Promise.resolve({ data: [], error: null }),
    query.from(TABLES.CASE_OUTCOME_EVENTS)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', caseId)
      .order('observed_at', { ascending: false }),
    query.from(TABLES.PROVIDER_CREDIT_RECORDS)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', caseId)
      .order('occurred_at', { ascending: false }),
  ]);
  if (snapshotResult.error) throw new Error(`reconciliation_snapshot_read_failed: ${snapshotResult.error.message}`);
  if (claimedResult.error) throw new Error(`reconciliation_claimed_item_read_failed: ${claimedResult.error.message}`);
  if (parcelResult.error) throw new Error(`reconciliation_shipment_line_read_failed: ${parcelResult.error.message}`);
  if (outcomesResult.error) throw new Error(`reconciliation_outcome_read_failed: ${outcomesResult.error.message}`);
  if (creditsResult.error) throw new Error(`reconciliation_credit_read_failed: ${creditsResult.error.message}`);

  const latest = new Map<string, Record<string, any>>();
  for (const row of rows(snapshotResult.data)) {
    if (!latest.has(String(row.recommendation_type))) latest.set(String(row.recommendation_type), row);
  }
  return {
    input,
    claimedItems: rows(claimedResult.data),
    parcels: input.parcels,
    shipmentLines: rows(parcelResult.data),
    outcomes: rows(outcomesResult.data),
    providerCredits: rows(creditsResult.data),
    matrix: buildItemParcelMatrix(input),
    recommendations: {
      customerAction: latest.get('customer_action') ?? null,
      responsibility: latest.get('responsibility') ?? null,
      recovery: latest.get('recovery') ?? null,
    },
  };
}
