import type { ClaimRow } from '@/app/(app)/claims/claimsPageData';

export type ClaimEvidenceStatus = {
  evidenceStatus: string;
  reviewState: string;
};

export function claimNextAction(
  claim: ClaimRow,
  _latestOutcome: { decision: string; outcome: string; updated_at: string } | null,
  _currentUserId: string,
): ClaimEvidenceStatus {
  const snoozedUntil = claim.snoozed_until ? new Date(claim.snoozed_until) : null;
  if (snoozedUntil && snoozedUntil.getTime() > Date.now()) {
    return {
      evidenceStatus: 'Linked identity evidence available after follow-up date',
      reviewState: `Evidence state: Deferred until ${snoozedUntil.toLocaleDateString('en-US')}`,
    };
  }
  switch (claim.status) {
    case 'open':
      return {
        evidenceStatus: 'Linked identity evidence available',
        reviewState: claim.first_viewed_at
          ? 'Review state: Needs review'
          : 'Evidence state: New evidence found',
      };
    case 'pending':
      return {
        evidenceStatus: 'Waiting on delivery or customer source data',
        reviewState: 'Evidence state: Waiting on source data',
      };
    case 'escalated':
      return {
        evidenceStatus: 'High-density identity evidence available',
        reviewState: 'Evidence state: High evidence density',
      };
    case 'resolved_refunded':
    case 'resolved_won':
    case 'resolved_lost':
    case 'resolved_denied':
    case 'resolved_exchanged':
      return {
        evidenceStatus: 'Merchant-recorded outcome on file',
        reviewState: 'Evidence state: Outcome recorded',
      };
    case 'voided':
      return {
        evidenceStatus: 'Claim voided — no active evidence review',
        reviewState: 'Evidence state: Archived',
      };
    case 'stale':
      return {
        evidenceStatus: 'Reopen if new identity evidence arrives',
        reviewState: 'Evidence state: Stale',
      };
    default:
      return {
        evidenceStatus: 'Linked identity evidence available',
        reviewState: 'Review state: Needs review',
      };
  }
}

export function buildClaimsQueryString(
  sp: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {},
) {
  const merged: Record<string, string | undefined> = { ...sp, ...overrides };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key];
  }
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value == null || value === '') continue;
    next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : '';
}
