'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CLAIM_TYPE_LABELS,
  STATUS_LABELS,
} from '@/components/claims/claimReviewLabels';
import { formatClaimMoney, inputStyle } from '@/components/claims/claimReviewStyles';
import { StatusPill } from '@/components/claims/claimReviewPrimitives';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import { useBreadcrumbLabel } from '@/components/layout/BreadcrumbOverrideContext';
import { caseDisplay } from '@/lib/ui/displayRef';
import { label } from '@/lib/ui/labels';
import { formatDateAbsolute } from '@/lib/utils/format';
import { RowActionsMenu } from '@/components/ui/RowActionsMenu';

export function ClaimReviewHeader({ wb }: { wb: ClaimReviewWorkbench }) {
  const router = useRouter();
  const { selectedClaim, history, claimId, customerName, customerProfileHref } = wb;

  // Breadcrumb (WS2): "<Customer> · <ref>" — never the raw case UUID from the URL.
  useBreadcrumbLabel(
    selectedClaim
      ? caseDisplay({
          customer_name: customerName,
          ref: selectedClaim.shopify_order_id ?? selectedClaim.order_ref ?? null,
          id: selectedClaim.id,
        })
      : customerName || null,
  );

  return (
    <header
      className="border-b px-4 py-4 md:px-6"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {selectedClaim ? (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {(selectedClaim.claim_type ? CLAIM_TYPE_LABELS[selectedClaim.claim_type] ?? selectedClaim.claim_type : null) ?? 'Payout case'}
                </h1>
                <StatusPill status={selectedClaim.status} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>{caseDisplay({ customer_name: customerName, ref: selectedClaim.shopify_order_id ?? selectedClaim.order_ref, id: selectedClaim.id })}</span>
                {selectedClaim.amount_at_risk != null && selectedClaim.currency ? <><span>·</span><span className="tabular-nums">{formatClaimMoney(selectedClaim.amount_at_risk, selectedClaim.currency)}</span></> : null}
                <span>·</span><span>Requested: {selectedClaim.requested_action && selectedClaim.requested_action !== 'unknown' ? label('requestedAction', selectedClaim.requested_action) : 'Not specified'}</span>
                {selectedClaim.created_at || selectedClaim.submitted_at ? <><span>·</span><span>Opened {formatDateAbsolute(selectedClaim.created_at ?? selectedClaim.submitted_at ?? '')}</span></> : null}
              </p>
            </div>
          ) : (
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Evidence review</span>
          )}
          {history.length > 1 ? (
            <select
              aria-label="Switch claim"
              className="px-2 py-1.5 rounded-md text-xs"
              style={inputStyle()}
              value={claimId}
              onChange={(e) => wb.setClaimId(e.target.value)}
            >
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {caseDisplay({ customer_name: customerName, ref: h.shopify_order_id ?? h.order_ref, id: h.id })} · {STATUS_LABELS[h.status] ?? h.status}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={customerProfileHref} className="px-3 py-1.5 rounded-[6px] text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Open customer profile
          </Link>
          <RowActionsMenu
            label="Case actions"
            actions={[
              { label: 'Back to queue', onSelect: () => router.push('/claims') },
              ...(wb.state.nextClaimHref ? [{ label: 'Next review', onSelect: () => router.push(wb.state.nextClaimHref as string) }] : []),
            ]}
          />
        </div>
      </div>
    </header>
  );
}
