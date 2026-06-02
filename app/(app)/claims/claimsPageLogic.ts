import type { ClaimRow } from '@/app/(app)/claims/claimsPageData';

export function claimNextAction(
  claim: ClaimRow,
  latestOutcome: { decision: string; outcome: string; updated_at: string } | null,
  currentUserId: string,
) {
  const owner = claim.assigned_to === currentUserId ? 'Assigned to me' : claim.assigned_to ? 'Assigned' : 'Unassigned';
  const snoozedUntil = claim.snoozed_until ? new Date(claim.snoozed_until) : null;
  if (snoozedUntil && snoozedUntil.getTime() > Date.now()) {
    return { stage: 'Snoozed', owner, next: `Follow up ${snoozedUntil.toLocaleDateString('en-US')}` };
  }
  switch (claim.status) {
    case 'open':
      return { stage: claim.first_viewed_at ? 'Viewed' : 'New / unread', owner, next: 'Review linked identity evidence' };
    case 'pending':
      return { stage: 'Awaiting info', owner, next: 'Wait for carrier or customer update' };
    case 'escalated':
      return { stage: 'Escalated', owner, next: 'Review escalation context' };
    case 'resolved_refunded':
    case 'resolved_won':
    case 'resolved_lost':
    case 'resolved_denied':
    case 'resolved_exchanged':
      return { stage: 'Outcome recorded', owner: 'Merchant', next: 'In history' };
    case 'voided':
      return { stage: 'Voided', owner: 'Merchant', next: 'Archived' };
    case 'stale':
      return { stage: 'Stale', owner: 'System', next: 'Reopen if new evidence arrives' };
    default:
      return { stage: 'Review', owner, next: 'Record next action' };
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
