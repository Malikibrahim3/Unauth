'use client';

import Link from 'next/link';
import {
  CLAIM_TYPE_LABELS,
  STATUS_LABELS,
} from '@/components/claims/claimReviewLabels';
import { formatClaimMoney, inputStyle } from '@/components/claims/claimReviewStyles';
import { StatusPill, SlaBadge } from '@/components/claims/claimReviewPrimitives';
import type { ClaimType } from '@/components/claims/claimReviewTypes';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewHeader({ wb }: { wb: ClaimReviewWorkbench }) {
  const { selectedClaim, history, claimId, customerName, customerProfileHref } = wb;

  return (
    <header
      className="sticky top-0 z-30 border-b px-4 md:px-6 py-3"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          {selectedClaim ? (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {CLAIM_TYPE_LABELS[selectedClaim.claim_type as ClaimType] ?? selectedClaim.claim_type ?? 'Claim'}
                </span>
                <StatusPill status={selectedClaim.status} />
                <SlaBadge claim={selectedClaim} />
                {selectedClaim.amount_at_risk != null && (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {formatClaimMoney(selectedClaim.amount_at_risk, selectedClaim.currency)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {selectedClaim.shopify_order_id ?? selectedClaim.order_ref ?? '-'}
                {' · '}{customerName}
                {' · '}{selectedClaim.first_viewed_at ? 'Previously reviewed' : 'New evidence found'}
                {' · '}{selectedClaim.first_viewed_at ? 'Review state: Needs review' : 'Evidence state: New evidence'}
              </p>
            </div>
          ) : (
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Evidence review</span>
          )}
          {history.length > 1 && (
            <select
              aria-label="Switch claim"
              className="px-2 py-1.5 rounded-md text-xs"
              style={inputStyle()}
              value={claimId}
              onChange={(e) => wb.setClaimId(e.target.value)}
            >
              <option value="">Switch claim…</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.shopify_order_id ?? h.order_ref ?? h.id.slice(0, 8)} · {STATUS_LABELS[h.status] ?? h.status}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/claims" className="px-3 py-1.5 rounded-[6px] text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Back to claim index
          </Link>
          {wb.state.nextClaimHref && (
            <Link href={wb.state.nextClaimHref} className="px-3 py-1.5 rounded-[6px] text-xs font-semibold" style={{ background: 'var(--accent)', color: 'white' }}>
              Next review
            </Link>
          )}
          <Link href={customerProfileHref} className="px-3 py-1.5 rounded-[6px] text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Customer profile
          </Link>
        </div>
      </div>
    </header>
  );
}
