'use client';

import { PanelCard } from '@/components/ui';
import { CLAIM_TYPE_LABELS } from '@/components/claims/claimReviewLabels';
import { formatOrderOption } from '@/components/claims/claimReviewLogic';
import { inputStyle } from '@/components/claims/claimReviewStyles';
import { FieldLabel } from '@/components/claims/claimReviewPrimitives';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import type { ClaimType } from '@/components/claims/claimReviewTypes';

export function ClaimReviewFormSection({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    shops,
    shopDomain,
    orderOptions,
    claimId,
    claimFormOpen,
    state,
    patch,
  } = wb;

  return (
    <PanelCard
      as="section"
      variant="app"
      className="order-3 min-w-0 overflow-hidden p-0 min-[1100px]:col-start-1 min-[1100px]:row-start-2"
    >
      <button
        type="button"
        onClick={() => patch({ claimFormOpen: !claimFormOpen })}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{claimId ? 'Source case details' : 'Connected source intake'}</span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{claimFormOpen ? '▲' : '▼'}</span>
      </button>
      {claimFormOpen && (
        <div className="px-4 pb-4 pt-0 border-t space-y-3" style={{ borderColor: 'var(--border-muted)' }}>
          <PanelCard variant="appInset" className="px-3 py-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Case facts are created from connected order, helpdesk, payment, returns, carrier, warehouse, or correspondence sources. Missing data stays marked unavailable until a connector or matched source record supplies it.
          </PanelCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shops.length > 0 && (
              <div>
                <FieldLabel htmlFor="connected-shop">Connected shop</FieldLabel>
                {shops.length <= 1 ? (
                  <input id="connected-shop" aria-label="Connected shop" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={shopDomain} readOnly />
                ) : (
                  <select id="connected-shop" aria-label="Connected shop" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={shopDomain} onChange={(e) => patch({ shopDomain: e.target.value })}>
                    {shops.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            )}
            <div className={shops.length > 0 ? '' : 'sm:col-span-2'}>
              <FieldLabel htmlFor="claim-order">Order</FieldLabel>
              {orderOptions.length > 0 ? (
                <select id="claim-order" aria-label="Order" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.selectedOrderId} onChange={(e) => patch({ selectedOrderId: e.target.value })}>
                  {orderOptions.length > 1 && <option value="">Select a source order...</option>}
                  {orderOptions.map((o) => <option key={o.id} value={o.id}>{formatOrderOption(o)}</option>)}
                </select>
              ) : (
                <PanelCard id="claim-order" variant="appInset" className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No connected order record is available for this context.
                </PanelCard>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="claim-type">Claim type</FieldLabel>
              <select id="claim-type" aria-label="Claim type" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.claimType} onChange={(e) => patch({ claimType: e.target.value as ClaimType })} disabled>
                {(Object.entries(CLAIM_TYPE_LABELS) as [ClaimType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="order-value">Order value</FieldLabel>
              <input id="order-value" type="number" min="0" step="0.01" aria-label="Order value" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="Source value unavailable" value={state.orderValue} readOnly />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="customer-reason">Customer reason</FieldLabel>
              <textarea id="customer-reason" aria-label="Customer reason" className="w-full px-2 py-1.5 rounded-md text-xs resize-none" style={inputStyle()} rows={2} value={state.customerReason} readOnly />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="internal-notes">Source notes</FieldLabel>
              <textarea id="internal-notes" aria-label="Source notes" className="w-full px-2 py-1.5 rounded-md text-xs resize-none" style={inputStyle()} rows={2} value={state.notes} readOnly />
            </div>
          </div>
        </div>
      )}
    </PanelCard>
  );
}
