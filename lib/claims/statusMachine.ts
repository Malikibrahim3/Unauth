export const CANONICAL_CLAIM_STATUSES = [
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
  if (status === 'under_review' || status === 'evidence_requested' || status === 'unresolved_unreviewed') return 'open';
  if (status === 'resolved' || status === 'closed') return 'resolved_refunded';
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
  options: { allowReopen?: boolean } = {}
): boolean {
  const from = normalizeLegacyClaimStatus(fromStatus);
  const to = normalizeLegacyClaimStatus(toStatus);
  if (!to) return false;
  if (!from || from === to) return true;
  if (to === 'voided') return true;

  if (options.allowReopen && isCanonicalFinalClaimStatus(from) && to === 'open') {
    return true;
  }

  if (isCanonicalFinalClaimStatus(from)) return false;

  if (from === 'pending') return to === 'open' || to === 'stale';
  if (from === 'open') return to === 'escalated' || (isCanonicalFinalClaimStatus(to) && to !== 'stale');
  if (from === 'escalated') return to === 'resolved_won' || to === 'resolved_lost';

  return false;
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
