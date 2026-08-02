'use client';

import { ChevronDown } from 'lucide-react';
import { Card, Select, Textarea } from '@/components/ui';
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
    <Card unstyled
      id="source-case-details"
      as="section"
      variant="panel"
      className="min-w-0 overflow-hidden p-0"
    >
      <button
        type="button"
        onClick={() => patch({ claimFormOpen: !claimFormOpen })}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="ua-text-label">{claimId ? 'Edit case details' : 'Connected source intake'}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="shrink-0 transition-transform duration-[var(--ua-duration-fast)]"
          style={{ transform: claimFormOpen ? 'rotate(180deg)' : undefined, color: 'var(--ua-icon-secondary)' }}
        />
      </button>
      {claimFormOpen && (
        <div className="px-4 pb-4 pt-0 border-t space-y-3" style={{ borderColor: 'var(--ua-border-subtle)' }}>
          <Card unstyled variant="muted" className="px-3 py-2 ua-text-caption-role leading-relaxed">
            Case facts are created from connected order, helpdesk, payment, returns, carrier, warehouse, or correspondence sources. Missing data stays marked unavailable until a connector or matched source record supplies it.
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shops.length > 0 && (
              <div>
                <FieldLabel htmlFor="connected-shop">Connected shop</FieldLabel>
                {shops.length <= 1 ? (
                  <input id="connected-shop" aria-label="Connected shop" className="ua-text-body w-full px-2 py-1.5 rounded-md" style={inputStyle()} value={shopDomain} readOnly />
                ) : (
                  <Select id="connected-shop" aria-label="Connected shop" style={inputStyle()} value={shopDomain} onChange={(e) => patch({ shopDomain: e.target.value })}>
                    {shops.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                )}
              </div>
            )}
            <div className={shops.length > 0 ? '' : 'sm:col-span-2'}>
              <FieldLabel htmlFor="claim-order">Order</FieldLabel>
              {orderOptions.length > 0 ? (
                <Select id="claim-order" aria-label="Order" style={inputStyle()} value={state.selectedOrderId} onChange={(e) => patch({ selectedOrderId: e.target.value })}>
                  {orderOptions.length > 1 && <option value="">Select a source order...</option>}
                  {orderOptions.map((o) => <option key={o.id} value={o.id}>{formatOrderOption(o)}</option>)}
                </Select>
              ) : (
                <Card unstyled id="claim-order" variant="muted" className="ua-text-caption-role px-2 py-1.5" style={{ color: 'var(--ua-text-secondary)' }}>
                  No connected order record is available for this context.
                </Card>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="claim-type">Case type</FieldLabel>
              <Select id="claim-type" aria-label="Case type" style={inputStyle()} value={state.claimType} onChange={(e) => patch({ claimType: e.target.value as ClaimType })} disabled>
                {(Object.entries(CLAIM_TYPE_LABELS) as [ClaimType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="order-value">Order value</FieldLabel>
              <input id="order-value" type="number" min="0" step="0.01" aria-label="Order value" className="ua-text-body w-full px-2 py-1.5 rounded-md" style={inputStyle()} placeholder="Source value unavailable" value={state.orderValue} readOnly />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="customer-reason">Customer reason</FieldLabel>
              <Textarea id="customer-reason" aria-label="Customer reason" className="resize-none" style={inputStyle()} rows={2} value={state.customerReason} readOnly />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="internal-notes">Source notes</FieldLabel>
              <Textarea id="internal-notes" aria-label="Source notes" className="resize-none" style={inputStyle()} rows={2} value={state.notes} readOnly />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
