'use client';
import { useEffect, useMemo, useState } from 'react';
import { submitClaim, submitEvidence, submitOutcome } from '@/lib/claims/workflowClient';

type ClaimType = 'missing_parcel' | 'damaged' | 'wrong_item' | 'refund_request' | 'chargeback' | 'return_abuse' | 'other';
type Decision = 'approved' | 'denied' | 'escalated' | 'partial_refund' | 'full_refund' | 'chargeback_disputed' | 'blacklist' | 'no_action';
type Outcome = 'loss' | 'recovered' | 'pending' | 'chargeback_won' | 'chargeback_lost' | 'customer_verified' | 'suspected_fraud';
type EvidenceType = 'tracking' | 'proof_of_delivery' | 'customer_message' | 'support_ticket' | 'return_label' | 'warehouse_scan' | 'payment_dispute' | 'note' | 'other';
type EvidenceSource = 'manual' | 'csv_import' | 'zendesk' | 'gorgias' | 'shopify' | 'stripe' | 'paypal' | 'carrier';

function safeKey(v: string) { return /^[a-zA-Z0-9_.-]{1,40}$/.test(v); }
function clean(v: string) { return v.replace(/[<>]/g, '').trim(); }

export default function ClaimReviewPanel({ profileId }: { profileId: string }) {
  const [data, setData] = useState<any>(null);
  const [shops, setShops] = useState<string[]>([]);
  const [shopDomain, setShopDomain] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [claimType, setClaimType] = useState<ClaimType>('missing_parcel');
  const [customerReason, setCustomerReason] = useState('');
  const [notes, setNotes] = useState('');
  const [claimId, setClaimId] = useState('');
  const [decision, setDecision] = useState<Decision>('escalated');
  const [outcome, setOutcome] = useState<Outcome>('pending');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('tracking');
  const [source, setSource] = useState<EvidenceSource>('manual');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceHash, setEvidenceHash] = useState('');
  const [metaRows, setMetaRows] = useState<Array<{ key: string; value: string }>>([{ key: 'note', value: '' }]);
  const [state, setState] = useState<'idle'|'busy'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/customers/${profileId}`).then(r => r.ok ? r.json() : null).then((x) => {
      setData(x);
      const first = x?.orderHistory?.[0]?.orderId;
      if (first) setSelectedOrderId(first);
    }).catch(() => {});
    fetch(`/api/claims?profileId=${encodeURIComponent(profileId)}`).then(r => r.ok ? r.json() : null).then((x) => {
      if (!x) return;
      setShops(x.shops ?? []);
      setShopDomain(x.activeShopDomain ?? '');
      setHistory(x.claims ?? []);
    }).catch(() => {});
  }, [profileId]);

  const order = useMemo(() => data?.orderHistory?.find((o: any) => o.orderId === selectedOrderId), [data, selectedOrderId]);

  const metadata = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of metaRows) {
      const k = clean(r.key);
      if (!k || !safeKey(k)) continue;
      out[k] = clean(r.value).slice(0, 200);
    }
    return out;
  }, [metaRows]);

  async function refreshHistory() {
    const x = await fetch(`/api/claims?profileId=${encodeURIComponent(profileId)}&orderId=${encodeURIComponent(selectedOrderId)}`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (x?.claims) setHistory(x.claims);
  }

  async function onClaim() {
    setState('busy');
    const r = await submitClaim({ id: claimId || undefined, shop_domain: shopDomain, shopify_order_id: selectedOrderId, customer_id: profileId, claim_type: claimType, customer_claim_reason: customerReason, normalized_reason: notes, status: 'under_review' });
    setState('idle'); setMessage(r.message); if (r.claimId) setClaimId(r.claimId); await refreshHistory();
  }
  async function onOutcome() {
    if (!claimId) return setMessage('Create claim first');
    setState('busy');
    const r = await submitOutcome(claimId, { decision, outcome, notes });
    setState('idle'); setMessage(r.message); await refreshHistory();
  }
  async function onEvidence() {
    if (!claimId) return setMessage('Create claim first');
    setState('busy');
    const r = await submitEvidence(claimId, { evidence_type: evidenceType, source, evidence_url: evidenceUrl || null, evidence_hash: evidenceHash || null, metadata });
    setState('idle'); setMessage(r.message);
  }

  return <div className="p-8 max-w-5xl mx-auto space-y-5">
    <h1 className="text-heading-lg">Claim Review</h1>
    <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div>Order number: <strong>{selectedOrderId || '—'}</strong></div>
        <div>Customer linkage summary: <strong>{data?.linkedAccounts?.length ?? 0} linked accounts</strong></div>
        <div>Risk score/signals: <strong>{order?.fraudScore ?? data?.profile?.risk_score ?? '—'}</strong> · {(order?.fraudFlags ?? data?.profile?.fraud_flags ?? []).slice(0,3).join(', ') || 'none'}</div>
        <div>Refund/Fulfillment status: <strong>{order?.refundStatus ?? 'unknown'}</strong></div>
        <div>postDeliveryClaimRate: <strong>{(order?.fraudFlags ?? []).includes('postDeliveryClaimRate') ? 'present' : 'not present'}</strong></div>
        <div>Evidence summary: <strong>{(order?.fraudFlags ?? []).length} signals</strong></div>
        <div>Previous claims count: <strong>{history.length}</strong></div>
      </div>
    </div>

    <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <p className="text-overline mb-2">Context</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Shop</label>
          {shops.length <= 1 ? <input className="w-full px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={shopDomain} readOnly /> :
            <select className="w-full px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={shopDomain} onChange={e => setShopDomain(e.target.value)}>{shops.map(s => <option key={s} value={s}>{s}</option>)}</select>}
        </div>
        <div>
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Order</label>
          <select className="w-full px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}>
            <option value="">Select order…</option>
            {(data?.orderHistory ?? []).map((o: any) => <option key={o.orderId} value={o.orderId}>{o.orderId} · {o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-GB') : 'n/a'} · {typeof o.orderValue === 'number' ? o.orderValue.toFixed(2) : 'n/a'} · {o.refundStatus ?? 'unknown'}</option>)}
          </select>
        </div>
      </div>
    </section>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-2">Claim</p>
        <input className="w-full mb-2 px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="Claim id (optional, for update)" value={claimId} onChange={e => setClaimId(e.target.value)} />
        <select className="w-full mb-2 px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={claimType} onChange={e => setClaimType(e.target.value as ClaimType)}>{['missing_parcel','damaged','wrong_item','refund_request','chargeback','return_abuse','other'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        <textarea className="w-full mb-2 px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="Customer claim reason" value={customerReason} onChange={e => setCustomerReason(e.target.value)} />
        <textarea className="w-full mb-2 px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="Internal merchant notes" value={notes} onChange={e => setNotes(e.target.value)} />
        <button onClick={onClaim} disabled={state==='busy'} className="px-4 py-2 rounded-md text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>Save claim</button>
      </section>

      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-2">Decision</p>
        <select className="w-full mb-2 px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={decision} onChange={e => setDecision(e.target.value as Decision)}>{['approved','denied','escalated','partial_refund','full_refund','chargeback_disputed','blacklist','no_action'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        <select className="w-full mb-2 px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={outcome} onChange={e => setOutcome(e.target.value as Outcome)}>{['loss','recovered','pending','chargeback_won','chargeback_lost','customer_verified','suspected_fraud'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        <button onClick={onOutcome} disabled={state==='busy'} className="px-4 py-2 rounded-md text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>Save outcome</button>
      </section>
    </div>

    <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <p className="text-overline mb-2">Evidence</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <select className="px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={evidenceType} onChange={e => setEvidenceType(e.target.value as EvidenceType)}>{['tracking','proof_of_delivery','customer_message','support_ticket','return_label','warehouse_scan','payment_dispute','note','other'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        <select className="px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={source} onChange={e => setSource(e.target.value as EvidenceSource)}>{['manual','csv_import','zendesk','gorgias','shopify','stripe','paypal','carrier'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        <input className="px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="evidence url" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} />
        <input className="px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="evidence hash" value={evidenceHash} onChange={e => setEvidenceHash(e.target.value)} />
      </div>
      <div className="mt-2 space-y-2">
        {metaRows.map((r, i) => <div key={i} className="grid grid-cols-2 gap-2"><input className="px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="key" value={r.key} onChange={e => setMetaRows(prev => prev.map((x, ix) => ix===i ? { ...x, key: e.target.value } : x))} /><input className="px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="value" value={r.value} onChange={e => setMetaRows(prev => prev.map((x, ix) => ix===i ? { ...x, value: e.target.value } : x))} /></div>)}
        <button onClick={() => setMetaRows(prev => [...prev, { key: '', value: '' }])} className="px-3 py-1 rounded-md text-xs" style={{ border: '1px solid var(--border)' }}>+ add metadata</button>
      </div>
      <button onClick={onEvidence} disabled={state==='busy'} className="mt-2 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>Save evidence</button>
    </section>

    <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <p className="text-overline mb-2">Claim History</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr style={{ color: 'var(--text-muted)' }}><th className="text-left py-2">Claim</th><th className="text-left py-2">Status</th><th className="text-left py-2">Type</th><th className="text-left py-2">Decision/Outcome</th><th className="text-left py-2">At risk</th><th className="text-left py-2">Updated</th></tr></thead>
          <tbody>{history.map((h) => <tr key={h.id} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}><td className="py-2">{h.shopify_order_id}</td><td className="py-2">{h.status}</td><td className="py-2">{h.claim_type}</td><td className="py-2">{h.latest_outcome ? `${h.latest_outcome.decision} / ${h.latest_outcome.outcome}` : '—'}</td><td className="py-2">{h.amount_at_risk ?? '—'}</td><td className="py-2">{h.updated_at ? new Date(h.updated_at).toLocaleString('en-GB') : '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </section>

    {message && <p className="text-sm" style={{ color: message.toLowerCase().includes('permission denied') ? 'var(--risk-high-fg)' : 'var(--text-muted)' }}>{message}</p>}
  </div>;
}
