'use client';

import { CLAIM_TYPE_LABELS } from '@/components/claims/claimReviewLabels';
import { formatOrderOption } from '@/components/claims/claimReviewLogic';
import { btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import { FieldLabel } from '@/components/claims/claimReviewPrimitives';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import type { ClaimType } from '@/components/claims/claimReviewTypes';

export function ClaimReviewFormSection({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    shops,
    shopDomain,
    orderOptions,
    manualMode,
    claimId,
    claimFormOpen,
    activeDuplicateClaim,
    resolvedDuplicateClaim,
    busy,
    primaryAction,
    state,
    patch,
    setClaimId,
    onClaim,
  } = wb;

  return (
    <section
      className="order-3 min-w-0 min-[1100px]:col-start-1 min-[1100px]:row-start-2 rounded-md border overflow-hidden"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <button
        type="button"
        onClick={() => patch({ claimFormOpen: !claimFormOpen })}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{claimId ? 'Edit claim details' : 'Create claim'}</span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{claimFormOpen ? '▲' : '▼'}</span>
      </button>
      {claimFormOpen && (
        <div className="px-4 pb-4 pt-0 border-t space-y-3" style={{ borderColor: 'var(--border-muted)' }}>
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
              {!manualMode && orderOptions.length > 0 ? (
                <>
                  <select id="claim-order" aria-label="Order" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.selectedOrderId} onChange={(e) => patch({ selectedOrderId: e.target.value })}>
                    {orderOptions.length > 1 && <option value="">Select an order…</option>}
                    {orderOptions.map((o) => <option key={o.id} value={o.id}>{formatOrderOption(o)}</option>)}
                  </select>
                  <button type="button" onClick={() => patch({ manualModeExplicit: true })} className="mt-1 text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>Enter reference manually</button>
                </>
              ) : (
                <div className="space-y-1.5">
                  <input id="claim-order" aria-label="Order reference" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="Order reference" value={state.manualOrderRef} onChange={(e) => patch({ manualOrderRef: e.target.value })} />
                  <select aria-label="Order source" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.manualOrderSource} onChange={(e) => patch({ manualOrderSource: e.target.value })}>
                    <option value="manual">Manual entry</option>
                    <option value="shopify">Shopify</option>
                  </select>
                  {orderOptions.length > 0 && (
                    <button type="button" onClick={() => patch({ manualModeExplicit: false })} className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>← Back to order list</button>
                  )}
                </div>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="claim-type">Claim type</FieldLabel>
              <select id="claim-type" aria-label="Claim type" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={state.claimType} onChange={(e) => patch({ claimType: e.target.value as ClaimType })}>
                {(Object.entries(CLAIM_TYPE_LABELS) as [ClaimType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="order-value">Order value (optional)</FieldLabel>
              <input id="order-value" type="number" min="0" step="0.01" aria-label="Order value" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="0.00" value={state.orderValue} onChange={(e) => patch({ orderValue: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="customer-reason">Customer&apos;s reason</FieldLabel>
              <textarea id="customer-reason" aria-label="Customer reason" className="w-full px-2 py-1.5 rounded-md text-xs resize-none" style={inputStyle()} rows={2} value={state.customerReason} onChange={(e) => patch({ customerReason: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="internal-notes">Internal notes</FieldLabel>
              <textarea id="internal-notes" aria-label="Internal notes" className="w-full px-2 py-1.5 rounded-md text-xs resize-none" style={inputStyle()} rows={2} value={state.notes} onChange={(e) => patch({ notes: e.target.value })} />
            </div>
          </div>
          {activeDuplicateClaim && (
            <p className="text-xs rounded-md px-2 py-1.5" style={{ border: '1px solid var(--risk-critical-bd)', background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)' }}>
              Active claim exists. <button type="button" onClick={() => setClaimId(activeDuplicateClaim.id)} className="font-semibold underline">Open it</button>
            </p>
          )}
          {resolvedDuplicateClaim && (
            <p className="text-xs rounded-md px-2 py-1.5" style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}>
              Outcome already recorded for this order. <button type="button" onClick={() => setClaimId(resolvedDuplicateClaim.id)} className="font-semibold underline" style={{ color: 'var(--accent)' }}>Open it</button>
            </p>
          )}
          <button
            type="button"
            onClick={onClaim}
            disabled={busy}
            className="w-full sm:w-auto px-4 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            style={btnStyle(primaryAction.key === 'save_claim' ? 'primary' : 'secondary')}
          >
            {busy ? <><span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Saving…</> : claimId ? 'Update claim' : 'Save claim'}
          </button>
        </div>
      )}
    </section>
  );
}
