'use client';
import { useEffect, useMemo, useState } from 'react';
import { submitClaim, submitEvidence, submitOutcome } from '@/lib/claims/workflowClient';

type ClaimType = 'missing_parcel' | 'damaged' | 'wrong_item' | 'refund_request' | 'chargeback' | 'return_abuse' | 'other';
type Decision = 'approved' | 'denied' | 'escalated' | 'partial_refund' | 'full_refund' | 'chargeback_disputed' | 'blacklist' | 'no_action';
type Outcome = 'loss' | 'recovered' | 'pending' | 'chargeback_won' | 'chargeback_lost' | 'customer_verified' | 'suspected_fraud';
type EvidenceType = 'tracking' | 'proof_of_delivery' | 'customer_message' | 'support_ticket' | 'return_label' | 'warehouse_scan' | 'payment_dispute' | 'note' | 'other';
type EvidenceSource = 'manual' | 'csv_import' | 'zendesk' | 'gorgias' | 'shopify' | 'stripe' | 'paypal' | 'carrier';

export default function ClaimReviewPanel({ profileId, shopDomain }: { profileId: string; shopDomain: string }) {
  const [data, setData] = useState<any>(null);
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
  const [metadataJson, setMetadataJson] = useState('{}');
  const [state, setState] = useState<'idle'|'busy'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/customers/${profileId}`).then(r => r.ok ? r.json() : null).then((x) => {
      setData(x);
      const first = x?.orderHistory?.[0]?.orderId;
      if (first) setSelectedOrderId(first);
    }).catch(() => {});
  }, [profileId]);

  const order = useMemo(() => data?.orderHistory?.find((o: any) => o.orderId === selectedOrderId), [data, selectedOrderId]);

  async function onClaim() {
    setState('busy');
    const r = await submitClaim({ id: claimId || undefined, shop_domain: shopDomain, shopify_order_id: selectedOrderId, customer_id: profileId, claim_type: claimType, customer_claim_reason: customerReason, normalized_reason: notes, status: 'under_review' });
    setState('idle'); setMessage(r.message); if (r.claimId) setClaimId(r.claimId);
  }
  async function onOutcome() {
    if (!claimId) return setMessage('Create claim first');
    setState('busy');
    const r = await submitOutcome(claimId, { decision, outcome, notes });
    setState('idle'); setMessage(r.message);
  }
  async function onEvidence() {
    if (!claimId) return setMessage('Create claim first');
    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(metadataJson || '{}'); } catch {}
    setState('busy');
    const r = await submitEvidence(claimId, { evidence_type: evidenceType, source, evidence_url: evidenceUrl || null, evidence_hash: evidenceHash || null, metadata });
    setState('idle'); setMessage(r.message);
  }

  return <div className="p-8 max-w-4xl mx-auto space-y-5">
    <h1 className="text-heading-lg">Claim Review</h1>
    <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div>Order number: <strong>{selectedOrderId || '—'}</strong></div>
        <div>Customer linkage summary: <strong>{data?.linkedAccounts?.length ?? 0} linked accounts</strong></div>
        <div>Risk score/signals: <strong>{order?.fraudScore ?? data?.profile?.risk_score ?? '—'}</strong> · {(order?.fraudFlags ?? data?.profile?.fraud_flags ?? []).slice(0,3).join(', ') || 'none'}</div>
        <div>Refund/Fulfillment status: <strong>{order?.refundStatus ?? 'unknown'}</strong></div>
        <div>postDeliveryClaimRate: <strong>{(order?.fraudFlags ?? []).includes('postDeliveryClaimRate') ? 'present' : 'not present'}</strong></div>
        <div>Evidence summary: <strong>{(order?.fraudFlags ?? []).length} signals</strong></div>
        <div>Previous claims count: <strong>{data?.profile?.total_refund_claims ?? 0}</strong></div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-2">Claim</p>
        <input className="w-full mb-2 px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="Claim id (optional, for update)" value={claimId} onChange={e => setClaimId(e.target.value)} />
        <input className="w-full mb-2 px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} placeholder="Order ID" value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)} />
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
      <textarea className="mt-2 w-full px-3 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)' }} value={metadataJson} onChange={e => setMetadataJson(e.target.value)} />
      <button onClick={onEvidence} disabled={state==='busy'} className="mt-2 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>Save evidence</button>
    </section>
    {message && <p className="text-sm" style={{ color: message.toLowerCase().includes('permission denied') ? 'var(--risk-high-fg)' : 'var(--text-muted)' }}>{message}</p>}
  </div>;
}
