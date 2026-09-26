'use client';

import Link from '@/components/navigation/AppNavLink';
import type { OrderOption, PackageIncludeItem, PriorMatchPreview } from '@/components/evidence/evidencePackageFormTypes';
import { evidencePackageOrderAmount } from '@/components/evidence/evidencePackageOrderAmount';
import { formatDateAbsolute } from '@/lib/utils/format';

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

const mono = "'IBM Plex Mono',monospace";
const card = { background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' } as const;

function availabilityDetail(item: PackageIncludeItem, priorMatch: PriorMatchPreview, checking: boolean) {
  if (item.pending || checking) return 'Checking the recorded source coverage';
  if (item.label.toLowerCase().includes('prior matching')) {
    return priorMatch === 'likely' ? 'Observed in retained customer records' : priorMatch === 'unlikely' ? 'No matching transaction was observed' : 'Source result unavailable';
  }
  if (item.optional) return item.available ? 'Merchant-authored context is held' : 'No merchant note is included';
  return item.available ? 'Held in the current customer and order records' : 'Unavailable · no supporting source record';
}

function Check({ selected }: { selected: boolean }) {
  return (
    <span style={{ width: 15, height: 15, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: selected ? '#1c1f23' : '#fff', boxShadow: selected ? 'none' : 'inset 0 0 0 1.5px #ddd8d1' }} aria-hidden="true">
      {selected ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"><path d="M2 5.2 4.1 7.3 8 3.2" /></svg> : null}
    </span>
  );
}

function InclusionRow({ item, priorMatchPreview, priorMatchChecking }: { item: PackageIncludeItem; priorMatchPreview: PriorMatchPreview; priorMatchChecking: boolean }) {
  const selected = item.available;
  const unavailable = !item.available && !item.optional && !item.pending;
  const status = item.pending || priorMatchChecking
    ? { label: 'CHECKING', background: '#f4f3f1', color: '#64686d' }
    : selected
      ? { label: 'HELD', background: '#eef6f1', color: '#1a6b43' }
      : unavailable
        ? { label: 'UNAVAILABLE', background: '#fdf0e6', color: '#b0431a' }
        : { label: 'NOT INCLUDED', background: '#f4f3f1', color: '#64686d' };
  return (
    <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #f4f2ef', opacity: unavailable ? .6 : 1 }}>
      <Check selected={selected} />
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>{item.label}</div><div style={{ marginTop: 2, color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{availabilityDetail(item, priorMatchPreview, priorMatchChecking)} · {item.packEffect}</div>{!selected && item.repairHref ? <Link href={item.repairHref} style={{ display: 'inline-block', marginTop: 3, color: '#9f4f08', font: "500 10.5px/1.4 'Inter',sans-serif" }}>Review source</Link> : null}</div>
      <span style={{ width: 110, flex: 'none', color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>{item.source}<br/>{item.freshness}</span>
      <span style={{ width: 104, flex: 'none', textAlign: 'right' }}><span style={{ padding: '2px 7px', borderRadius: 5, background: status.background, color: status.color, font: "500 10px/1.5 'Inter',sans-serif" }}>{status.label}</span></span>
    </div>
  );
}

function Fact({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'positive' | 'warning' }) {
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{label}</span><span style={{ color: tone === 'positive' ? '#1a6b43' : tone === 'warning' ? '#7a5310' : '#40454a', font: `400 11.5px/1.5 ${mono}`, textAlign: 'right' }}>{value}</span></div>;
}

export function EvidencePackageFormFields({
  profileId,
  orders,
  selectedOrderId,
  notes: _notes,
  loading,
  error,
  priorMatchPreview,
  priorMatchChecking,
  packageIncludes,
  canSubmit,
  onOrderChange,
  onNotesChange: _onNotesChange,
  onSubmit,
  onCancel,
}: Props) {
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const selectedCount = packageIncludes.filter((item) => item.available).length;
  const unavailableCount = packageIncludes.filter((item) => !item.available && !item.optional).length;

  return (
    <form id="evidence-package-form" onSubmit={onSubmit} style={{ width: '100%', height: '100%', minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14, overflow: 'hidden' }} data-operations-surface="evidence-package">
      <aside style={{ width: 300, flex: 'none', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 11, overflowY: 'auto' }}>
        <div style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>WHICH ORDER</div>
        <div id="select-order" style={{ ...card, padding: '4px 13px 9px', display: 'flex', flexDirection: 'column' }}>
          {orders.map((order) => {
            const selectable = order.refund_claimed || order.id === selectedOrderId;
            const selected = order.id === selectedOrderId;
            return (
              <button key={order.id} type="button" disabled={!selectable} onClick={() => onOrderChange(order.id)} style={{ margin: '0 -13px', padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10, border: 0, borderTop: '1px solid #f4f2ef', background: selected ? '#ffffff' : '#fff', boxShadow: selected ? 'inset 2px 0 0 #ff7a30' : 'none', opacity: selectable ? 1 : .55, color: '#1c1f23', textAlign: 'left', cursor: selectable ? 'pointer' : 'default' }}>
                <span style={{ width: 13, height: 13, flex: 'none', borderRadius: '50%', boxShadow: selected ? 'inset 0 0 0 4px #1c1f23' : 'inset 0 0 0 1.5px #ddd8d1' }} />
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', color: '#1c1f23', font: `${selected ? 500 : 400} 12px/1.35 ${mono}` }}>{order.order_id}</span><span style={{ display: 'block', marginTop: 3, color: '#64686d', font: "400 10.5px/1.5 'Inter',sans-serif" }}>{order.source_name ?? order.source ?? 'source unavailable'} · {formatDateAbsolute(order.processed_at)} · {evidencePackageOrderAmount({ amount: order.order_value, currency: order.currency })}</span><span style={{ display: 'block', marginTop: 2, color: '#64686d', font: `400 9.5px/1.4 ${mono}` }}>record {order.immutable_id} · account {order.source_account_id ?? 'unavailable'}</span></span>
                <span style={{ flex: 'none', color: order.refund_claimed ? '#b0431a' : '#64686d', font: `400 10px/1.4 ${mono}` }}>{order.refund_claimed ? 'recorded problem' : 'no case'}</span>
              </button>
            );
          })}
        </div>
        <div style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>WHY THIS ORDER QUALIFIES</div>
        <div style={{ ...card, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Fact label="Has a recorded problem" value={selectedOrder?.refund_claimed ? 'yes' : 'no'} tone={selectedOrder?.refund_claimed ? 'positive' : 'neutral'} />
          <Fact label="Has a disputed delivery" value="unavailable" />
          <Fact label="Within the claim window" value="unavailable" />
          <Fact label="Prior signal match" value={priorMatchChecking ? 'checking' : priorMatchPreview === 'likely' ? 'observed' : priorMatchPreview === 'unlikely' ? 'not observed' : 'unavailable'} tone={priorMatchPreview === 'likely' ? 'warning' : 'neutral'} />
        </div>
        <div style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>WHERE IT WILL GO</div>
        <div style={{ ...card, padding: '12px 13px', color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>A package is a file, not a submission. After build it is retained with the customer evidence record; sending it to a carrier or card network is a separate merchant action.</div>
        <div style={{ flex: 1 }} />
        <div style={{ paddingTop: 10, borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>Building a package is logged with the source facts currently held and the gaps that remain unavailable.</div>
        <Link href={`/customers/${profileId}`} style={{ color: '#64686d', font: "400 11px/1.4 'Inter',sans-serif" }}>Back to customer</Link>
      </aside>

      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section id="review-evidence" style={{ ...card, flex: 1, minHeight: 0, padding: '12px 16px 10px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} aria-labelledby="what-to-include-title">
          <div style={{ paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span id="what-to-include-title" style={{ flex: 1, color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>WHAT TO INCLUDE</span>
            <span style={{ width: 110, flex: 'none', color: '#64686d', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em' }}>SOURCE</span>
            <span style={{ width: 104, flex: 'none', color: '#64686d', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em', textAlign: 'right' }}>AVAILABILITY</span>
          </div>
          {packageIncludes.map((item) => <InclusionRow key={item.label} item={item} priorMatchPreview={priorMatchPreview} priorMatchChecking={priorMatchChecking} />)}
          <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #f4f2ef', opacity: .6 }}>
            <Check selected={false} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>Photograph of the delivery point</div><div style={{ marginTop: 2, color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>No delivery photograph is held in the current package source records.</div></div>
            <span style={{ width: 110, flex: 'none', color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>carrier source</span>
            <span style={{ width: 104, flex: 'none', textAlign: 'right' }}><span style={{ padding: '2px 7px', borderRadius: 5, background: '#fdf0e6', color: '#b0431a', font: "500 10px/1.5 'Inter',sans-serif" }}>UNAVAILABLE</span></span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ marginTop: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14, borderRadius: 11, background: '#f4f3f1' }}>
            <div style={{ flex: 1 }}><div style={{ color: '#1c1f23', font: "500 12.5px/1.4 'Inter',sans-serif" }}>Unavailable evidence stays visible and is deliberately left out</div><div style={{ marginTop: 4, color: '#64686d', font: "400 11.5px/1.55 'Inter',sans-serif" }}>A source gap is useful to you and cannot be presented to a carrier as if it were held. The generated package retains that boundary.</div></div>
            <span style={{ flex: 'none', color: '#64686d', font: `400 10.5px/1.5 ${mono}` }}>{selectedCount} of {packageIncludes.length + 1} held</span>
          </div>
        </section>
        <section style={{ ...card, flex: 'none', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}><div style={{ color: '#1c1f23', font: "500 12.5px/1.4 'Inter',sans-serif" }}>The package will disclose {unavailableCount + 1} unavailable evidence item{unavailableCount + 1 === 1 ? '' : 's'}</div><div style={{ marginTop: 4, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>You can review connected sources first, or build now. Building creates evidence only; it does not decide the case, contact a provider, submit a recovery, or move money.</div>{error ? <div role="alert" style={{ marginTop: 6, color: '#b0431a', font: "500 11px/1.4 'Inter',sans-serif" }}>{error}</div> : null}</div>
          <div style={{ flex: 'none', display: 'flex', gap: 8 }}>
            {onCancel ? <button type="button" onClick={onCancel} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>Cancel</button> : <Link href="/sources/connected" style={{ padding: '7px 12px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Review sources first</Link>}
            <button type="submit" disabled={!canSubmit} style={{ padding: '7px 12px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : .55 }}>{loading ? 'Building…' : 'Build it anyway'}</button>
          </div>
        </section>
      </div>
    </form>
  );
}
