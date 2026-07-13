import { getClaimSlaState } from '@/lib/claims/sla';
import type { ClaimRow } from '@/app/(app)/claims/claimsPageData';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function StatusPill({ status }: { status: string }) {
  return <StatusBadge family="caseStatus" value={status} size="sm" />;
}

export function SlaPill({ claim }: { claim: ClaimRow }) {
  const sla = getClaimSlaState(claim);
  const value = sla.state === 'overdue' || sla.state === 'approaching' || sla.state === 'resolved' ? sla.state : 'normal';
  return <StatusBadge family="workflowStatus" value={value} size="sm" />;
}
