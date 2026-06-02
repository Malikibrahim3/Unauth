import { getClaimSlaState } from '@/lib/claims/sla';
import {
  SLA_COLOUR_MAP,
  STATUS_META,
  type ClaimRow,
} from '@/app/(app)/claims/claimsPageData';

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META['open'];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: m.bg, color: m.text }}
    >
      {m.label}
    </span>
  );
}

export function SlaPill({ claim }: { claim: ClaimRow }) {
  const sla = getClaimSlaState(claim);
  const c = SLA_COLOUR_MAP[sla.state] ?? SLA_COLOUR_MAP.normal;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {sla.label}
    </span>
  );
}
