/**
 * Reconciliation detectors (Phase 12).
 *
 * Each detector compares Unauth's records with connected-source data for one
 * merchant and raises de-duplicated exceptions for drift. Detectors are:
 *   - **data-supported only** — every check reads a field a connected source
 *     actually exposes. Where an outcome cannot be derived from available data
 *     (dispute won/lost, recovery paid), the detector raises a clearly-labelled
 *     UNKNOWN exception rather than inventing a result.
 *   - **idempotent** — stable dedup keys mean a re-run over unchanged data raises
 *     zero new exceptions.
 * Each returns { detector, found, raised } (raised = newly created only).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { raiseException, type RaiseExceptionInput } from '@/lib/exceptions/store';
import { label } from '@/lib/ui/labels';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';

export type DetectorResult = { detector: string; found: number; raised: number };

const SCAN_LIMIT = 500;
const STALE_CASE_DAYS = 14;
type Row = Record<string, unknown>;

async function readRows(query: PromiseLike<{ data: unknown; error: { message: string } | null }>, label: string): Promise<Row[]> {
  const { data, error } = await query;
  if (error) throw new Error(`${label}_failed: ${error.message}`);
  return (data ?? []) as Row[];
}

/** Raise each input and tally new vs already-present. */
async function raiseAll(client: SupabaseClient, merchantId: string, detector: string, inputs: RaiseExceptionInput[]): Promise<DetectorResult> {
  let raised = 0;
  for (const input of inputs) {
    const result = await raiseException(client, merchantId, input);
    if (result.created) raised += 1;
  }
  return { detector, found: inputs.length, raised };
}

/** Set of order ids (from the given list) that already have a payout case. */
async function ordersWithCases(client: SupabaseClient, merchantId: string, orderIds: string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();
  const rows = await readRows(
    client.from(TABLES.MERCHANT_CLAIMS).select('source_order_id').eq('merchant_id', merchantId).in('source_order_id', orderIds),
    'reconcile_cases_read',
  );
  return new Set(rows.map((r) => r.source_order_id as string).filter(Boolean));
}

// ── 1. Completed refund with no payout case ────────────────────────────────
export async function detectUnmatchedRefunds(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  const refunds = await readRows(
    client.from(TABLES.SOURCE_REFUNDS).select('id,source_order_id,amount,currency,refunded_at')
      .eq('merchant_id', merchantId).not('source_order_id', 'is', null)
      .order('refunded_at', { ascending: false }).limit(SCAN_LIMIT),
    'reconcile_refunds_read',
  );
  const covered = await ordersWithCases(client, merchantId, [...new Set(refunds.map((r) => r.source_order_id as string))]);
  const unmatched = refunds.filter((r) => !covered.has(r.source_order_id as string));
  return raiseAll(client, merchantId, 'unmatched_refunds', unmatched.map((r) => ({
    exceptionType: 'unmatched_refund', confidence: 'probable',
    title: 'Refund with no payout case',
    detail: `A refund of ${r.amount ?? '?'} ${r.currency ?? ''} was recorded in the commerce source with no support payout case for its order.`.trim(),
    context: { source_order_id: r.source_order_id, amount: r.amount, currency: r.currency, refunded_at: r.refunded_at },
    subjectEntityType: 'refund', subjectEntityId: r.id as string, sourceSystem: 'commerce',
    dedupKey: `reconcile:unmatched_refund:${r.id}`,
  })));
}

// ── 2. Refund amount differs from the case's recorded refund ────────────────
export async function detectChangedRefundAmounts(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  const refunds = await readRows(
    client.from(TABLES.SOURCE_REFUNDS).select('id,source_order_id,amount,currency')
      .eq('merchant_id', merchantId).not('source_order_id', 'is', null).not('amount', 'is', null)
      .order('refunded_at', { ascending: false }).limit(SCAN_LIMIT),
    'reconcile_refunds_read',
  );
  const orderIds = [...new Set(refunds.map((r) => r.source_order_id as string))];
  if (orderIds.length === 0) return { detector: 'changed_refund_amounts', found: 0, raised: 0 };
  const cases = await readRows(
    client.from(TABLES.MERCHANT_CLAIMS).select('id,source_order_id,refund_amount,currency')
      .eq('merchant_id', merchantId).in('source_order_id', orderIds).not('refund_amount', 'is', null),
    'reconcile_cases_read',
  );
  const caseByOrder = new Map(cases.map((c) => [c.source_order_id as string, c]));
  const conflicts = refunds.filter((r) => {
    const c = caseByOrder.get(r.source_order_id as string);
    if (!c) return false;
    return Math.abs(Number(r.amount) - Number(c.refund_amount)) > 0.005;
  });
  return raiseAll(client, merchantId, 'changed_refund_amounts', conflicts.map((r) => {
    const c = caseByOrder.get(r.source_order_id as string)!;
    return {
      exceptionType: 'conflicting_financials', confidence: 'probable',
      supportPayoutCaseId: c.id as string,
      title: 'Refund amount differs from the case',
      detail: `Source refund ${r.amount} ${r.currency ?? ''} differs from the case's recorded ${c.refund_amount}.`.trim(),
      context: { source_refund_id: r.id, source_amount: r.amount, case_refund_amount: c.refund_amount },
      subjectEntityType: 'refund', subjectEntityId: r.id as string, sourceSystem: 'commerce',
      dedupKey: `reconcile:refund_amount:${r.id}:${r.amount}`,
    };
  }));
}

// ── 3. Replacement not linked to a payout case ─────────────────────────────
export async function detectUnlinkedReplacements(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  const rows = await readRows(
    client.from(TABLES.SOURCE_REPLACEMENTS).select('id,source_order_id,item_value_minor,currency,issued_at')
      .eq('merchant_id', merchantId).is('support_payout_case_id', null)
      .order('issued_at', { ascending: false }).limit(SCAN_LIMIT),
    'reconcile_replacements_read',
  );
  return raiseAll(client, merchantId, 'unlinked_replacements', rows.map((r) => ({
    exceptionType: 'ambiguous_replacement', confidence: 'probable',
    title: 'Replacement not linked to a case',
    detail: 'A replacement was issued in the commerce source but is not linked to a support payout case.',
    context: { source_order_id: r.source_order_id, item_value_minor: r.item_value_minor, currency: r.currency, issued_at: r.issued_at },
    subjectEntityType: 'replacement', subjectEntityId: r.id as string, sourceSystem: 'commerce',
    dedupKey: `reconcile:unlinked_replacement:${r.id}`,
  })));
}

// ── 4. Return received but not linked to a case ────────────────────────────
export async function detectUnlinkedReturns(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  const rows = await readRows(
    client.from(TABLES.SOURCE_RETURNS).select('id,source_order_id,status,received_at,disposition')
      .eq('merchant_id', merchantId).is('support_payout_case_id', null).not('received_at', 'is', null)
      .order('received_at', { ascending: false }).limit(SCAN_LIMIT),
    'reconcile_returns_read',
  );
  return raiseAll(client, merchantId, 'unlinked_returns', rows.map((r) => ({
    exceptionType: 'other', confidence: 'probable',
    title: 'Return received, not linked to a case',
    detail: `A return was received (${r.disposition ?? r.status ?? 'received'}) in the source but is not linked to a support payout case.`,
    context: { source_order_id: r.source_order_id, status: r.status, received_at: r.received_at, disposition: r.disposition },
    subjectEntityType: 'return', subjectEntityId: r.id as string, sourceSystem: 'commerce',
    dedupKey: `reconcile:unlinked_return:${r.id}`,
  })));
}

// ── 5. Delivery outcome changed after the case last updated ────────────────
export async function detectDeliveryOutcomeUpdates(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  const shipments = await readRows(
    client.from(TABLES.SOURCE_SHIPMENTS).select('id,source_order_id,status,delivered_at')
      .eq('merchant_id', merchantId).not('source_order_id', 'is', null).not('delivered_at', 'is', null)
      .order('delivered_at', { ascending: false }).limit(SCAN_LIMIT),
    'reconcile_shipments_read',
  );
  const orderIds = [...new Set(shipments.map((s) => s.source_order_id as string))];
  if (orderIds.length === 0) return { detector: 'delivery_outcome_updates', found: 0, raised: 0 };
  const cases = await readRows(
    client.from(TABLES.MERCHANT_CLAIMS).select('id,source_order_id,status,updated_at')
      .eq('merchant_id', merchantId).in('source_order_id', orderIds).in('status', [...ACTIVE_CLAIM_STATUSES]),
    'reconcile_cases_read',
  );
  const caseByOrder = new Map(cases.map((c) => [c.source_order_id as string, c]));
  const updates = shipments.filter((s) => {
    const c = caseByOrder.get(s.source_order_id as string);
    if (!c) return false;
    return String(s.delivered_at) > String(c.updated_at ?? '');
  });
  return raiseAll(client, merchantId, 'delivery_outcome_updates', updates.map((s) => {
    const c = caseByOrder.get(s.source_order_id as string)!;
    return {
      exceptionType: 'stale_source_data', confidence: 'probable',
      supportPayoutCaseId: c.id as string,
      title: 'Delivery outcome updated after the case',
      detail: `Tracking reports delivery (${s.status ?? 'delivered'}) at ${s.delivered_at}, after the case was last updated. Evidence and recommendation may need refreshing.`,
      context: { source_shipment_id: s.id, delivered_at: s.delivered_at, status: s.status },
      subjectEntityType: 'shipment', subjectEntityId: s.id as string, sourceSystem: 'carrier',
      dedupKey: `reconcile:delivery_update:${s.id}:${s.delivered_at}`,
    };
  }));
}

// ── 6. Stale open case ─────────────────────────────────────────────────────
export async function detectStaleOpenCases(client: SupabaseClient, merchantId: string, nowMs: number): Promise<DetectorResult> {
  const cutoff = new Date(nowMs - STALE_CASE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rows = await readRows(
    client.from(TABLES.MERCHANT_CLAIMS).select('id,status,updated_at')
      .eq('merchant_id', merchantId).in('status', [...ACTIVE_CLAIM_STATUSES]).lt('updated_at', cutoff)
      .order('updated_at', { ascending: true }).limit(SCAN_LIMIT),
    'reconcile_stale_cases_read',
  );
  return raiseAll(client, merchantId, 'stale_open_cases', rows.map((c) => ({
    exceptionType: 'stale_source_data', confidence: 'probable',
    supportPayoutCaseId: c.id as string,
    title: 'Open case with no recent activity',
    detail: `This case has been open with no update for over ${STALE_CASE_DAYS} days. It may need chasing, closing, or a decision.`,
    context: { status: c.status, last_updated: c.updated_at },
    subjectEntityType: 'case', subjectEntityId: c.id as string,
    dedupKey: `reconcile:stale_case:${c.id}`,
  })));
}

// ── 7. Case eligible for financial closure ─────────────────────────────────
export async function detectClosureEligibleCases(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  // A resolved financial position (no remaining exposure, a confirmed loss or
  // written-off value) on a case that is still open is a conclusive, data-backed
  // signal that the case can be financially closed.
  const summaries = await readRows(
    client.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('support_payout_case_id,exposed_minor,confirmed_loss_minor,written_off_minor,recovered_minor,known_states')
      .eq('merchant_id', merchantId).eq('exposed_minor', 0).contains('known_states', ['exposed']).limit(SCAN_LIMIT),
    'reconcile_summaries_read',
  );
  const conclusive = summaries.filter((s) => Number(s.confirmed_loss_minor ?? 0) > 0 || Number(s.written_off_minor ?? 0) > 0 || Number(s.recovered_minor ?? 0) > 0);
  const caseIds = conclusive.map((s) => s.support_payout_case_id as string);
  if (caseIds.length === 0) return { detector: 'closure_eligible_cases', found: 0, raised: 0 };
  const openCases = await readRows(
    client.from(TABLES.MERCHANT_CLAIMS).select('id,status').eq('merchant_id', merchantId)
      .in('id', caseIds).in('status', [...ACTIVE_CLAIM_STATUSES]),
    'reconcile_cases_read',
  );
  return raiseAll(client, merchantId, 'closure_eligible_cases', openCases.map((c) => ({
    exceptionType: 'other', confidence: 'probable',
    supportPayoutCaseId: c.id as string,
    title: 'Case eligible for financial closure',
    detail: 'This case has no remaining exposure and a settled financial position, but is still open. Confirm closure.',
    context: { status: c.status },
    subjectEntityType: 'case', subjectEntityId: c.id as string,
    dedupKey: `reconcile:closure_eligible:${c.id}`,
  })));
}

// ── 8. Duplicated financial entries on a case ──────────────────────────────
export async function detectDuplicateFinancials(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  const entries = await readRows(
    client.from(TABLES.CASE_FINANCIAL_ENTRIES).select('id,support_payout_case_id,source_record_id,direction,amount_minor,state')
      .eq('merchant_id', merchantId).not('source_record_id', 'is', null).eq('state', 'confirmed_loss').limit(SCAN_LIMIT),
    'reconcile_financial_entries_read',
  );
  const groups = new Map<string, Row[]>();
  for (const e of entries) {
    const key = `${e.support_payout_case_id}:${e.source_record_id}:${e.direction}:${e.amount_minor}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(e);
  }
  const dupes = [...groups.entries()].filter(([, rows]) => rows.length > 1);
  return raiseAll(client, merchantId, 'duplicate_financials', dupes.map(([key, rows]) => ({
    exceptionType: 'conflicting_financials', confidence: 'unknown',
    supportPayoutCaseId: rows[0].support_payout_case_id as string,
    title: 'Duplicated financial entries on a case',
    detail: `${rows.length} confirmed financial entries share the same source record, direction, and amount — a likely double-count.`,
    context: { entry_ids: rows.map((r) => r.id), source_record_id: rows[0].source_record_id, direction: rows[0].direction, amount_minor: rows[0].amount_minor },
    subjectEntityType: 'case', subjectEntityId: rows[0].support_payout_case_id as string,
    dedupKey: `reconcile:dup_financial:${key}`,
  })));
}

// ── 9. Dispute outcome not exposed by the source (UNKNOWN) ─────────────────
export async function detectUnresolvedDisputeOutcomes(client: SupabaseClient, merchantId: string, nowMs: number): Promise<DetectorResult> {
  // We do not have a connected source that reports dispute won/lost. Past the
  // dispute deadline with no recorded outcome, raise an explicit UNKNOWN rather
  // than guessing the result.
  const nowIso = new Date(nowMs).toISOString();
  const rows = await readRows(
    client.from(TABLES.LOSS_CASES).select('id,support_payout_case_id,case_category,status,claim_deadline_at')
      .eq('merchant_id', merchantId).eq('case_category', 'chargeback_or_payment_dispute')
      .not('claim_deadline_at', 'is', null).lt('claim_deadline_at', nowIso)
      .in('status', ['detected', 'collecting_evidence', 'submitted', 'evidence_pack_ready']).limit(SCAN_LIMIT),
    'reconcile_dispute_read',
  );
  return raiseAll(client, merchantId, 'unresolved_dispute_outcomes', rows.map((l) => ({
    exceptionType: 'unsupported_external_outcome', confidence: 'unknown',
    supportPayoutCaseId: (l.support_payout_case_id as string | null) ?? undefined,
    title: 'Dispute outcome not available from the source',
    detail: 'The dispute deadline has passed but no connected source reports whether it was won or lost. Record the outcome to finalise the loss.',
    context: { loss_case_id: l.id, deadline: l.claim_deadline_at, status: l.status },
    subjectEntityType: 'loss_case', subjectEntityId: l.id as string,
    dedupKey: `reconcile:dispute_unknown:${l.id}`,
  })));
}

// ── 10. Recovery result missing past deadline (UNKNOWN) ────────────────────
export async function detectMissingRecoveryOutcomes(client: SupabaseClient, merchantId: string, nowMs: number): Promise<DetectorResult> {
  const nowIso = new Date(nowMs).toISOString();
  const rows = await readRows(
    client.from(TABLES.RECOVERY_CASES).select('id,support_payout_case_id,status,deadline_at')
      .eq('merchant_id', merchantId).not('deadline_at', 'is', null).lt('deadline_at', nowIso)
      .not('status', 'in', '("paid","closed_unrecoverable","rejected")').limit(SCAN_LIMIT),
    'reconcile_recovery_read',
  );
  return raiseAll(client, merchantId, 'missing_recovery_outcomes', rows.map((r) => ({
    exceptionType: 'missing_recovery_result', confidence: 'unknown',
    supportPayoutCaseId: (r.support_payout_case_id as string | null) ?? undefined,
    title: 'Recovery result not available past deadline',
    detail: 'The recovery deadline has passed but no connected source reports the outcome. Record whether it was approved, paid, or rejected.',
    context: { recovery_case_id: r.id, deadline: r.deadline_at, status: r.status },
    subjectEntityType: 'recovery_case', subjectEntityId: r.id as string,
    dedupKey: `reconcile:recovery_missing:${r.id}`,
  })));
}

// ── 11. Open/ambiguous record matches need a decision ──────────────────────
export async function detectProbableMatches(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  const candidates = await readRows(
    client.from(TABLES.RECORD_MATCH_CANDIDATES)
      .select('id,subject_entity_type,subject_entity_id,candidate_entity_type,candidate_entity_id,confidence')
      .eq('merchant_id', merchantId).eq('status', 'open').limit(SCAN_LIMIT),
    'reconcile_matches_read',
  );
  const bySubject = new Map<string, Row[]>();
  for (const c of candidates) {
    const key = `${c.subject_entity_type}:${c.subject_entity_id}`;
    (bySubject.get(key) ?? bySubject.set(key, []).get(key)!).push(c);
  }
  const inputs: RaiseExceptionInput[] = [...bySubject.entries()].map(([key, rows]) => {
    const ambiguous = rows.length > 1;
    const subjectLabel = label('matchSubjectEntity', rows[0].subject_entity_type as string);
    return {
      exceptionType: 'match_uncertainty', confidence: 'probable',
      title: ambiguous ? `Ambiguous ${subjectLabel} match` : `Probable ${subjectLabel} match to confirm`,
      detail: ambiguous
        ? `${rows.length} plausible matches for this ${subjectLabel}. Confirm the correct one or reject all.`
        : `One plausible match for this ${subjectLabel}. Confirm or reject it.`,
      context: {
        subject_entity_type: rows[0].subject_entity_type,
        subject_entity_id: rows[0].subject_entity_id,
        candidate_ids: rows.map((r) => r.id),
        candidates: rows.map((r) => ({ id: r.id, entity_type: r.candidate_entity_type, entity_id: r.candidate_entity_id, confidence: r.confidence })),
        is_match_exception: true,
      },
      subjectEntityType: rows[0].subject_entity_type as string,
      subjectEntityId: rows[0].subject_entity_id as string,
      dedupKey: `reconcile:match:${key}`,
    };
  });
  return raiseAll(client, merchantId, 'probable_matches', inputs);
}
