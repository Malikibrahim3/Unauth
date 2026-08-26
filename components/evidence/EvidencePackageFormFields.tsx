'use client';

import Link from 'next/link';
import { Button, Textarea } from '@/components/ui';
import type { OrderOption, PackageIncludeItem, PriorMatchPreview } from '@/components/evidence/evidencePackageFormTypes';
import { evidencePackageOrderAmount } from '@/components/evidence/evidencePackageOrderAmount';
import { formatDateAbsolute } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import styles from './EvidencePackageOperations.module.css';

type Props = {
  profileId: string;
  orders: OrderOption[];
  selectedOrderId: string;
  notes: string;
  loading: boolean;
  error: string;
  priorMatchPreview: PriorMatchPreview;
  priorMatchChecking: boolean;
  packageIncludes: PackageIncludeItem[];
  canSubmit: boolean;
  onOrderChange: (orderId: string) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel?: () => void;
};

function availabilityDetail(item: PackageIncludeItem, priorMatch: PriorMatchPreview, checking: boolean) {
  if (item.pending || checking) return 'Checking the recorded source coverage';
  if (item.label.toLowerCase().includes('prior matching')) {
    return priorMatch === 'likely' ? 'Observed in retained customer records' : priorMatch === 'unlikely' ? 'No matching transaction was observed' : 'Source result unavailable';
  }
  if (item.optional) return item.available ? 'Merchant note will be included' : 'Optional · add a note below';
  return item.available ? 'Held in the current customer and order records' : 'Unavailable · no supporting source record';
}

export function EvidencePackageFormFields({
  profileId,
  orders,
  selectedOrderId,
  notes,
  loading,
  error,
  priorMatchPreview,
  priorMatchChecking,
  packageIncludes,
  canSubmit,
  onOrderChange,
  onNotesChange,
  onSubmit,
  onCancel,
}: Props) {
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const availableItems = packageIncludes.filter((item) => item.available).length;
  const unavailableItems = packageIncludes.filter((item) => !item.available && !item.optional).length;
  const unselectedItems = packageIncludes.filter((item) => item.optional && !item.available).length;
  const customerRef = `Customer ${hashId(profileId)}`;
  const selectedAmount = selectedOrder ? evidencePackageOrderAmount({ amount: selectedOrder.order_value, currency: selectedOrder.currency }) : 'Amount unavailable';

  return (
    <form id="evidence-package-form" onSubmit={onSubmit} className={styles.stack} data-operations-surface="evidence-package">
      <div className={styles.builderGrid}>
        <section className={styles.card} id="select-order" aria-labelledby="select-order-title">
          <header><h2 id="select-order-title">1 · Select the order</h2><p>Choose the recorded order this evidence package will support.</p></header>
          <div className={styles.choiceList}>
            {orders.map((order) => {
              const selectable = order.refund_claimed || order.id === selectedOrderId;
              const selected = order.id === selectedOrderId;
              return (
                <button key={order.id} type="button" className={styles.choice} data-selected={selected} data-state={selectable ? 'available' : 'unavailable'} disabled={!selectable} onClick={() => onOrderChange(order.id)}>
                  <i className={styles.radio} aria-hidden="true" />
                  <span className={styles.choiceCopy}><strong className={styles.mono}>{order.order_id}</strong><small>{formatDateAbsolute(order.processed_at)} · {order.refund_claimed ? 'recorded refund claim or dispute' : 'no recorded problem'}</small></span>
                  <b>{evidencePackageOrderAmount({ amount: order.order_value, currency: order.currency })}</b>
                </button>
              );
            })}
          </div>
          <p className={styles.footnote}>{orders.filter((order) => !order.refund_claimed && order.id !== selectedOrderId).length} further orders have no recorded problem, so they cannot be packaged. That is not the same as having no history.</p>
        </section>

        <section className={styles.card} id="review-evidence" aria-labelledby="review-evidence-title">
          <header><h2 id="review-evidence-title">2 · Review the evidence</h2><p>Held items retain source and freshness. Unavailable evidence stays visible as a gap.</p></header>
          <div className={styles.choiceList}>
            {packageIncludes.map((item) => {
              const selected = item.available;
              const unavailable = !item.available && !item.optional && !item.pending;
              return <div key={item.label} className={styles.choice} data-selected={selected} data-state={unavailable ? 'unavailable' : 'available'}><i className={styles.check} aria-hidden="true" /><span className={styles.choiceCopy}><strong>{item.label}</strong><small>{availabilityDetail(item, priorMatchPreview, priorMatchChecking)}</small></span></div>;
            })}
            <div className={styles.choice} data-state="unavailable"><i className={styles.check} aria-hidden="true" /><span className={styles.choiceCopy}><strong>Delivery photograph</strong><small>Unavailable — no delivery photograph exists in the connected source records</small></span></div>
          </div>
        </section>

        <div className={styles.sideStack}>
          <section className={styles.card} id="package-summary" aria-labelledby="package-summary-title">
            <header><h2 id="package-summary-title">3 · Confirm the package</h2><p>Review exactly what will be built before creating the package.</p></header>
            <dl className={styles.summaryList}>
              <dt>Package</dt><dd>Draft · identity assigned after build</dd>
              <dt>For</dt><dd>{selectedOrder ? `${selectedOrder.order_id} · recorded problem` : '— Select an order'}</dd>
              <dt>Customer</dt><dd>{customerRef}</dd>
              <dt>Order</dt><dd>{selectedOrder ? `${selectedOrder.order_id} · ${selectedAmount}${selectedOrder.currency ? ` ${selectedOrder.currency}` : ''}` : '— Unavailable'}</dd>
              <dt>Items included</dt><dd>{availableItems} of {packageIncludes.length + 1} available</dd>
              <dt>Gaps stated</dt><dd>{unavailableItems + 1} unavailable, {unselectedItems} not selected</dd>
              <dt>Scope line</dt><dd>{selectedOrder?.currency ?? 'Currency unavailable'} · source records as currently retained</dd>
            </dl>
            <div className={styles.disclosure}>The package states that a delivery photograph is unavailable. A reviewer can see the gap was disclosed rather than omitted.</div>
            <div className={styles.confirmationBoundary}><strong>Before you build</strong><span>This creates an evidence package only. It does not decide the case, contact a provider, submit a recovery, or move money.</span></div>
            <div className={styles.actions}><Button type="submit" size="sm" disabled={!canSubmit}>{loading ? 'Building package…' : 'Build evidence package'}</Button>{onCancel ? <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button> : <Link href={`/customers/${profileId}`} className="ua-button ua-button--secondary ua-button--sm"><span>Cancel</span></Link>}</div>
          </section>

          <section className={styles.card}>
            <header><h2>Where it can be used</h2><p>A package is evidence, not a decision or a claim.</p></header>
            <div className={styles.useRows}>
              <div><span>Attach to a case</span><small>Available after build</small></div>
              <div><span>Submit with a recovery</span><small>Partner requirements remain separately checked</small></div>
              <div><span>Send to a partner</span><small>External submission is a separate merchant action</small></div>
              <div><span>Export for review</span><small>Includes the scope line and every source</small></div>
            </div>
          </section>
        </div>
      </div>

      <section className={styles.card}>
        <header><h2>What is still missing, and who can supply it</h2><p>A gap with a named owner is work. A gap with no possible source is a fact about the case.</p></header>
        <div className={styles.gaps}>
          <article className={styles.gap}><header><strong>Customer statement</strong><i>Requestable</i></header><p>Ask the customer to confirm the reported problem in writing.</p><small>Owner and due date are recorded when the request is created.</small></article>
          <article className={styles.gap}><header><strong>Delivery photograph</strong><i data-state="unavailable">Unavailable</i></header><p>No connected source has a delivery photograph for this order.</p><small>It remains a disclosed case fact, not an outstanding task.</small></article>
          <article className={styles.gap}><header><strong>Merchant note</strong><i>{notes.trim() ? 'Held' : 'Optional'}</i></header><p>{notes.trim() ? 'The merchant note below will be retained in the package.' : 'Add internal context only when it helps the reviewer interpret the source facts.'}</p><small>Notes are merchant-authored and labelled separately from source records.</small></article>
        </div>
        <label className={styles.notes}><span>Merchant note · optional · appears in the package · max 500 characters</span><Textarea value={notes} onChange={(event) => onNotesChange(event.target.value.slice(0, 500))} rows={3} placeholder="Additional context to include in the evidence package" /><small>{notes.length}/500</small></label>
      </section>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </form>
  );
}
