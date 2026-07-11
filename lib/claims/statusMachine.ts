export const CANONICAL_CLAIM_STATUSES = [
  'new',
  'evidence_needed',
  'awaiting_customer_evidence',
  'awaiting_carrier_response',
  'awaiting_3pl_response',
  'awaiting_supplier_response',
  'ready_for_decision',
  'manual_review',
  'decision_recorded',
  'recovery_opened',
  'closed',
  'pending',
  'open',
  'escalated',
  'resolved_refunded',
  'resolved_won',
  'resolved_lost',
  'resolved_denied',
  'resolved_exchanged',
  'voided',
  'stale',
] as const;

export type CanonicalClaimStatus = (typeof CANONICAL_CLAIM_STATUSES)[number];

export const FINAL_CANONICAL_CLAIM_STATUSES = [
  'closed',
  'resolved_refunded',
  'resolved_won',
  'resolved_lost',
  'resolved_denied',
  'resolved_exchanged',
  'voided',
  'stale',
] as const satisfies readonly CanonicalClaimStatus[];

const STATUS_SET = new Set<string>(CANONICAL_CLAIM_STATUSES);
const FINAL_STATUS_SET = new Set<string>(FINAL_CANONICAL_CLAIM_STATUSES);

export function isCanonicalClaimStatus(status: string | null | undefined): status is CanonicalClaimStatus {
  return STATUS_SET.has(status ?? '');
}

export function isCanonicalFinalClaimStatus(status: string | null | undefined): status is (typeof FINAL_CANONICAL_CLAIM_STATUSES)[number] {
  return FINAL_STATUS_SET.has(status ?? '');
}

export function normalizeLegacyClaimStatus(status: string | null | undefined): CanonicalClaimStatus | null {
  if (!status) return null;
  if (isCanonicalClaimStatus(status)) return status;
  if (status === 'under_review' || status === 'unresolved_unreviewed') return 'manual_review';
  if (status === 'evidence_requested' || status === 'waiting_evidence') return 'evidence_needed';
  if (status === 'recommendation_ready') return 'ready_for_decision';
  if (status === 'resolved') return 'closed';
  return null;
}

export function claimStatusForOutcome(input: { decision: string; outcome: string }): CanonicalClaimStatus {
  const decision = input.decision;
  const outcome = input.outcome;

  if (decision === 'escalated' || decision === 'chargeback_disputed' || outcome === 'pending') return 'escalated';
  if (outcome === 'chargeback_won' || outcome === 'recovered') return 'resolved_won';
  if (outcome === 'chargeback_lost') return 'resolved_lost';
  if (decision === 'full_refund' || decision === 'partial_refund' || decision === 'approved') return 'resolved_refunded';
  if (decision === 'denied' || decision === 'blacklist' || decision === 'no_action') return 'resolved_denied';
  if (outcome === 'customer_verified' || outcome === 'legitimate') return 'resolved_denied';
  return outcome === 'loss' ? 'resolved_lost' : 'resolved_denied';
}

export function canTransitionClaimStatus(
  fromStatus: string | null | undefined,
  toStatus: string,
  options: { allowReopen?: boolean; allowSnooze?: boolean } = {}
): boolean {
  const from = normalizeLegacyClaimStatus(fromStatus);
  const to = normalizeLegacyClaimStatus(toStatus);
  if (!to) return false;
  if (!from || from === to) return true;
  if (to === 'voided') return true;

  if (options.allowReopen && isCanonicalFinalClaimStatus(from) && (to === 'open' || to === 'new')) {
    return true;
  }

  if (isCanonicalFinalClaimStatus(from)) return false;

  // `from` is now a non-final status. Block the specific invalid / backward
  // transitions the canonical diagram forbids, then allow forward progress.
  // Forward progress covers the v2 payout pipeline (new → evidence_needed →
  // awaiting_* → ready_for_decision → manual_review → decision_recorded →
  // recovery_opened → closed) and legacy open → escalated/resolve.
  //
  // NOTE: these guards are deliberately ordered BEFORE the permissive
  // `return true`. A previous version placed broad "non-final → anything"
  // rules first, which made these guards unreachable and wrongly allowed
  // backward transitions such as open → pending and open → stale.

  // `stale` is a terminal state only reachable from a snoozed `pending` claim.
  if (to === 'stale') return from === 'pending';
  // `pending` is an entry/snooze state, never a forward transition target.
  if (to === 'pending') return options.allowSnooze === true;
  // `escalated` (chargeback dispute) resolves only to won/lost outcomes.
  if (from === 'escalated') return to === 'resolved_won' || to === 'resolved_lost';

  return true;
}

export function assertClaimStatusTransition(
  fromStatus: string | null | undefined,
  toStatus: string,
  options: { allowReopen?: boolean } = {}
): CanonicalClaimStatus {
  const to = normalizeLegacyClaimStatus(toStatus);
  if (!to || !canTransitionClaimStatus(fromStatus, to, options)) {
    throw new Error(`illegal_claim_status_transition: ${fromStatus ?? 'null'} -> ${toStatus}`);
  }
  return to;
}
