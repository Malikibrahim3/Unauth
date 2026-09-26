import { getClaimSlaState } from '@/lib/claims/sla';
import type { ClaimRow } from './claimsPageData';
import { PAYOUT_CASE_STATUS_LABELS, type PayoutCaseStatus } from '@/lib/payouts/types';

const CASE_STATUS_TONE: Record<string, { background: string; color: string }> = {
  ready_for_decision: { background: '#fdf0e6', color: '#b0431a' },
  awaiting_customer_evidence: { background: '#fff3e9', color: '#7a5310' },
  awaiting_carrier_response: { background: '#fdf0e6', color: '#b0431a' },
  awaiting_3pl_response: { background: '#fdf0e6', color: '#b0431a' },
  awaiting_supplier_response: { background: '#fdf0e6', color: '#b0431a' },
  evidence_needed: { background: '#fff3e9', color: '#7a5310' },
};

function caseStatusLabel(status: string) {
  return PAYOUT_CASE_STATUS_LABELS[status as PayoutCaseStatus]
    ?? status.replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());
}

export function StatusPill({ status }: { status: string }) {
  const tone = CASE_STATUS_TONE[status] ?? { background: '#f4f3f1', color: '#40454a' };
  return (
    <span style={{ padding: '2px 7px', borderRadius: 5, background: tone.background, color: tone.color, font: "500 10px/1.5 'Inter',sans-serif", textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {caseStatusLabel(status)}
    </span>
  );
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
  return (
    <span style={{ padding: '2px 7px', borderRadius: 5, background: '#fff3e9', color: '#7a5310', font: "500 10px/1.5 'Inter',sans-serif", textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {sla.state}
    </span>
  );
}
