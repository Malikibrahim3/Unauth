import { getClaimSlaState } from '@/lib/claims/sla';
import type { ClaimRow } from '@/app/(app)/claims/claimsPageData';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function StatusPill({ status }: { status: string }) {
  return <StatusBadge family="caseStatus" value={status} size="sm" />;
}

/**
 * `uniform` is true when every row in the current result set shares this
 * claim's SLA state — most commonly after filtering to "Ageing first", where
 * every visible row is overdue by construction. A pill that is true of every
 * row encodes nothing (§3.1 T4), so it is dropped rather than styled.
 */
export function SlaPill({ claim, uniform }: { claim: ClaimRow; uniform?: boolean }) {
  const sla = getClaimSlaState(claim);
  if (sla.state !== 'overdue' && sla.state !== 'approaching') return null;
  if (uniform) return null;
  return <StatusBadge family="workflowStatus" value={sla.state} size="sm" />;
}
