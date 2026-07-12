import { getClaimSlaState } from '@/lib/claims/sla';
import {
  STATUS_META,
  type ClaimRow,
} from '@/app/(app)/claims/claimsPageData';
import { StatusBadge, statusBadgeVariantFor } from '@/components/ui';

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META['open'];
  return (
    <StatusBadge
      variant={statusBadgeVariantFor(status)}
      className="px-2 py-0.5 text-xs font-medium whitespace-nowrap"
    >
      {m.label}
    </StatusBadge>
  );
}

const SLA_DISPLAY_LABEL: Record<string, string> = {
  Overdue: 'Ageing',
  'Approaching SLA': 'Approaching threshold',
  Resolved: 'Outcome recorded',
  Normal: 'Within threshold',
  'SLA unknown': 'Age unknown',
};

export function SlaPill({ claim }: { claim: ClaimRow }) {
  const sla = getClaimSlaState(claim);
  const label = SLA_DISPLAY_LABEL[sla.label] ?? sla.label;
  return (
    <StatusBadge
      variant={statusBadgeVariantFor(sla.state)}
      className="px-2 py-0.5 text-xs font-medium whitespace-nowrap"
    >
      {label}
    </StatusBadge>
  );
}
