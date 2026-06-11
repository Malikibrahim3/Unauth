'use client';

import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  OUTCOME_LABELS,
} from '@/components/claims/claimReviewLabels';
import { getSlaVisual } from '@/components/claims/claimReviewLogic';
import { formatClaimAge, formatFiledDate } from '@/lib/claims/sla';
import { formatClaimMoney, slaToneStyle } from '@/components/claims/claimReviewStyles';
import { StatusPill } from '@/components/claims/claimReviewPrimitives';
import type { ClaimRecord, ClaimType, Decision, Outcome } from '@/components/claims/claimReviewTypes';

export function ClaimReviewHistoryTable({
  history,
  onSelectClaim,
}: {
  history: ClaimRecord[];
  onSelectClaim: (id: string) => void;
}) {
  if (history.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No claims recorded for this customer yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--text-secondary)' }}>
            <th className="text-left py-2 pr-3 text-xs font-semibold">Order ref</th>
            <th className="text-left py-2 pr-3 text-xs font-semibold">Status</th>
            <th className="text-left py-2 pr-3 text-xs font-semibold">Type</th>
            <th className="text-left py-2 pr-3 text-xs font-semibold">Decision / Outcome</th>
            <th className="text-left py-2 pr-3 text-xs font-semibold">Filed</th>
            <th className="text-left py-2 pr-3 text-xs font-semibold">Age</th>
            <th className="text-left py-2 pr-3 text-xs font-semibold">At risk</th>
            <th className="text-left py-2 text-xs font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => {
            const sla = getSlaVisual(h);
            const tone = slaToneStyle(sla.tone);
            return (
              <tr
                key={h.id}
                className="border-t cursor-pointer hover:bg-[var(--bg-subtle)]"
                style={{ borderColor: 'var(--border-muted)' }}
                onClick={() => onSelectClaim(h.id)}
              >
                <td className="py-2 pr-3 font-mono text-xs">{h.shopify_order_id ?? h.order_ref ?? '-'}</td>
                <td className="py-2 pr-3"><StatusPill status={h.status} /></td>
                <td className="py-2 pr-3">{CLAIM_TYPE_LABELS[h.claim_type as ClaimType] ?? h.claim_type}</td>
                <td className="py-2 pr-3">
                  {h.latest_outcome
                    ? `${DECISION_LABELS[h.latest_outcome.decision as Decision] ?? h.latest_outcome.decision} / ${OUTCOME_LABELS[h.latest_outcome.outcome as Outcome] ?? h.latest_outcome.outcome}`
                    : '-'}
                </td>
                <td className="py-2 pr-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{formatFiledDate(h)}</span>
                  <span className="block">{formatClaimAge(h)}</span>
                </td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: tone.bg, color: tone.text }}>
                    {sla.icon === 'clock' ? <span aria-hidden="true">🕐</span> : null}
                    {sla.icon === 'warning' ? <span aria-hidden="true">⚠</span> : null}
                    {sla.label}
                  </span>
                </td>
                <td className="py-2 pr-3">{h.amount_at_risk != null ? formatClaimMoney(h.amount_at_risk, h.currency) : '-'}</td>
                <td className="py-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {h.updated_at ? new Date(h.updated_at).toLocaleDateString('en-US') : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
