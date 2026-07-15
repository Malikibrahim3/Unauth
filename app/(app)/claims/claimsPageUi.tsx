import { getClaimSlaState } from '@/lib/claims/sla';
import type { ClaimRow } from '@/app/(app)/claims/claimsPageData';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function StatusPill({ status }: { status: string }) {
  return <StatusBadge family="caseStatus" value={status} size="sm" />;
}

export function SlaPill({ claim }: { claim: ClaimRow }) {
  const sla = getClaimSlaState(claim);
  if (sla.state !== 'overdue' && sla.state !== 'approaching') return null;
  return <StatusBadge family="workflowStatus" value={sla.state} size="sm" />;
}
