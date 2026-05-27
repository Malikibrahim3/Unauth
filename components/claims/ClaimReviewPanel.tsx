'use client';
import { useEffect, useMemo, useState } from 'react';
import { submitClaim, submitEvidence, submitOutcome } from '@/lib/claims/workflowClient';
import { signalLabel } from '@/lib/copy/signalLabels';
import { formatRiskScore } from '@/lib/utils/format';

type ClaimType = 'missing_parcel' | 'damaged' | 'wrong_item' | 'refund_request' | 'chargeback' | 'return_abuse' | 'other';
type Decision = 'approved' | 'denied' | 'escalated' | 'partial_refund' | 'full_refund' | 'chargeback_disputed' | 'blacklist' | 'no_action';
type Outcome = 'loss' | 'recovered' | 'pending' | 'chargeback_won' | 'chargeback_lost' | 'customer_verified' | 'suspected_fraud';
type EvidenceType = 'tracking' | 'proof_of_delivery' | 'customer_message' | 'support_ticket' | 'return_label' | 'warehouse_scan' | 'payment_dispute' | 'note' | 'other';
type EvidenceSource = 'manual' | 'csv_import' | 'zendesk' | 'gorgias' | 'shopify' | 'stripe' | 'paypal' | 'carrier';

type OrderOption = { id: string; orderLabel: string; orderValue: number | null; currency?: string | null; status: string; date?: string | null; source?: string };
type ClaimDraft = {
  selectedOrderId: string;
  claimType: ClaimType;
  customerReason: string;
  notes: string;
  claimId: string;
  decision: Decision;
  outcome: Outcome;
  evidenceType: EvidenceType;
  source: EvidenceSource;
  evidenceUrl: string;
  evidenceHash: string;
  metaRows: Array<{ key: string; value: string }>;
  manualOrderRef: string;
  manualOrderSource: string;
  manualModeExplicit: boolean;
  orderValue: string;
};

const DEFAULT_META_ROWS = [{ key: 'note', value: '' }];

const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  missing_parcel: 'Missing parcel',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

const DECISION_LABELS: Record<Decision, string> = {
  approved: 'Approved',
  denied: 'Denied',
  escalated: 'Escalated for review',
  partial_refund: 'Partial refund',
  full_refund: 'Full refund',
  chargeback_disputed: 'Chargeback disputed',
  blacklist: 'Blacklist customer',
  no_action: 'No action',
};

const OUTCOME_LABELS: Record<Outcome, string> = {
  loss: 'Loss accepted',
  recovered: 'Recovered',
  pending: 'Pending',
  chargeback_won: 'Chargeback won',
  chargeback_lost: 'Chargeback lost',
  customer_verified: 'Customer verified',
  suspected_fraud: 'Suspected fraud',
};

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  tracking: 'Tracking record',
  proof_of_delivery: 'Proof of delivery',
  customer_message: 'Customer message',
  support_ticket: 'Support ticket',
  return_label: 'Return label',
  warehouse_scan: 'Warehouse scan',
  payment_dispute: 'Payment dispute',
  note: 'Internal note',
  other: 'Other',
};

const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  manual: 'Manual upload',
  csv_import: 'CSV import',
  zendesk: 'Zendesk',
  gorgias: 'Gorgias',
  shopify: 'Shopify',
  stripe: 'Stripe',
  paypal: 'PayPal',
  carrier: 'Carrier',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under review',
  evidence_requested: 'Evidence requested',
  resolved: 'Resolved',
  closed: 'Closed',
};

function safeKey(v: string) { return /^[a-zA-Z0-9_.-]{1,40}$/.test(v); }
function clean(v: string) { return v.replace(/[<>]/g, '').trim(); }
function storageKey(profileId: string) { return `claims.review.draft.${profileId}`; }

export function loadClaimDraft(profileId: string): Partial<ClaimDraft> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClaimDraft>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveClaimDraft(profileId: string, draft: Partial<ClaimDraft>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(profileId), JSON.stringify(draft));
  } catch { /* Ignore storage failures */ }
}

export function clearClaimDraft(profileId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(profileId));
  } catch { /* noop */ }
}

function formatMoney(value: number | null | undefined, currency?: string | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency ?? 'GBP', minimumFractionDigits: 2 }).format(value);
}

function formatOrderOption(o: OrderOption) {
  const date = o.date ? new Date(o.date).toLocaleDateString('en-GB') : '—';
  const val = typeof o.orderValue === 'number' ? formatMoney(o.orderValue, o.currency) : '—';
  const status = o.status !== 'unknown' ? o.status : '—';
  return `${o.orderLabel} · ${val} · ${status} · ${date}`;
}

function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const colourMap: Record<string, { bg: string; text: string }> = {
    open: { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
    under_review: { bg: 'var(--sev-medium-fill, #FEF3C7)', text: 'var(--sev-medium, #B45309)' },
    evidence_requested: { bg: 'var(--sev-high-fill, #FEE2E2)', text: 'var(--sev-high, #991B1B)' },
    resolved: { bg: 'var(--sev-clear-fill, #DCFCE7)', text: 'var(--sev-clear, #166534)' },
    closed: { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
  };
  const c = colourMap[status] ?? { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{children}</label>;
}

function inputStyle(): React.CSSProperties {
  return { border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' };
}

export default function ClaimReviewPanel({ profileId }: { profileId: string }) {
  const [data, setData] = useState<any>(null);
  const [shopifyOrders, setShopifyOrders] = useState<any[]>([]);
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
  const [metaRows, setMetaRows] = useState<Array<{ key: string; value: string }>>(DEFAULT_META_ROWS);
  const [showMeta, setShowMeta] = useState(false);
  const [state, setState] = useState<'idle' | 'busy'>('idle');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'neutral'>('neutral');
  // Manual order entry (Fix 2)
  const [manualOrderRef, setManualOrderRef] = useState('');
  const [manualOrderSource, setManualOrderSource] = useState('manual');
  const [manualModeExplicit, setManualModeExplicit] = useState(false);
  // Order value for amount_at_risk (Fix 4)
  const [orderValue, setOrderValue] = useState('');

  useEffect(() => {
    fetch(`/api/customers/${profileId}`).then(r => r.ok ? r.json() : null).then((x) => setData(x)).catch(() => {});
    fetch(`/api/customers/${profileId}/shopify-orders`).then(r => r.ok ? r.json() : null).then((x) => {
      setShopifyOrders(x?.orders ?? []);
    }).catch(() => {});
    fetch(`/api/claims?profileId=${encodeURIComponent(profileId)}`).then(r => r.ok ? r.json() : null).then((x) => {
      if (!x) return;
      setShops(x.shops ?? []);
      setShopDomain(x.activeShopDomain ?? '');
      setHistory(x.claims ?? []);
    }).catch(() => {});
  }, [profileId]);

  useEffect(() => {
    const draft = loadClaimDraft(profileId);
    if (!draft) return;
    if (typeof draft.selectedOrderId === 'string') setSelectedOrderId(draft.selectedOrderId);
    if (typeof draft.claimType === 'string') setClaimType(draft.claimType as ClaimType);
    if (typeof draft.customerReason === 'string') setCustomerReason(draft.customerReason);
    if (typeof draft.notes === 'string') setNotes(draft.notes);
    if (typeof draft.claimId === 'string') setClaimId(draft.claimId);
    if (typeof draft.decision === 'string') setDecision(draft.decision as Decision);
    if (typeof draft.outcome === 'string') setOutcome(draft.outcome as Outcome);
    if (typeof draft.evidenceType === 'string') setEvidenceType(draft.evidenceType as EvidenceType);
    if (typeof draft.source === 'string') setSource(draft.source as EvidenceSource);
    if (typeof draft.evidenceUrl === 'string') setEvidenceUrl(draft.evidenceUrl);
    if (typeof draft.evidenceHash === 'string') setEvidenceHash(draft.evidenceHash);
    if (Array.isArray(draft.metaRows) && draft.metaRows.length > 0) setMetaRows(draft.metaRows);
    if (typeof draft.manualOrderRef === 'string') setManualOrderRef(draft.manualOrderRef);
    if (typeof draft.manualOrderSource === 'string') setManualOrderSource(draft.manualOrderSource);
    if (typeof draft.manualModeExplicit === 'boolean') setManualModeExplicit(draft.manualModeExplicit);
    if (typeof draft.orderValue === 'string') setOrderValue(draft.orderValue);
  }, [profileId]);

  useEffect(() => {
    saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, manualOrderRef, manualOrderSource, manualModeExplicit, orderValue });
  }, [profileId, selectedOrderId, claimType, customerReason, notes, claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, manualOrderRef, manualOrderSource, manualModeExplicit, orderValue]);

  const orderOptions = useMemo<OrderOption[]>(() => {
    const map = new Map<string, OrderOption>();
    for (const o of data?.orderHistory ?? []) {
      const id = String(o.orderId ?? '');
      if (!id) continue;
      map.set(id, {
        id,
        orderLabel: String(o.orderNumber ?? o.orderId ?? id),
        orderValue: typeof o.orderValue === 'number' ? o.orderValue : null,
        currency: o.currency ?? null,
        status: o.refundStatus ?? 'unknown',
        date: o.orderDate ?? null,
        source: 'audit',
      });
    }
    for (const o of shopifyOrders) {
      const id = String(o.id ?? o.shopify_order_id ?? '');
      if (!id) continue;
      map.set(id, {
        id,
        orderLabel: String(o.order_id ?? o.order_number ?? id),
        orderValue: typeof o.order_value === 'number' ? o.order_value : null,
        currency: o.currency ?? null,
        status: o.status ?? 'unknown',
        date: o.processed_at ?? null,
        source: 'shopify',
      });
    }
    for (const h of history) {
      const id = String(h.shopify_order_id ?? h.order_ref ?? '');
      if (!id || map.has(id)) continue;
      map.set(id, {
        id,
        orderLabel: id,
        orderValue: typeof h.amount_at_risk === 'number' ? h.amount_at_risk : null,
        currency: h.currency ?? null,
        status: h.status ?? 'unknown',
        date: h.updated_at ?? null,
        source: h.order_source ?? 'manual',
      });
    }
    return Array.from(map.values());
  }, [data, history, shopifyOrders]);

  // Auto-engage manual mode when no orders are available; otherwise respect explicit toggle.
  const manualMode = manualModeExplicit || orderOptions.length === 0;

  useEffect(() => {
    if (selectedOrderId && orderOptions.some((o) => o.id === selectedOrderId)) return;
    if (orderOptions.length === 1) {
      setSelectedOrderId(orderOptions[0].id);
      return;
    }
    if (!selectedOrderId && orderOptions.length > 1) {
      const fromHistory = history[0]?.shopify_order_id ?? history[0]?.order_ref;
      if (fromHistory && orderOptions.some((o) => o.id === fromHistory)) {
        setSelectedOrderId(String(fromHistory));
      }
    }
  }, [history, orderOptions, selectedOrderId]);

  const selectedOrder = useMemo(() => orderOptions.find((o) => o.id === selectedOrderId), [orderOptions, selectedOrderId]);
  const order = useMemo(() => data?.orderHistory?.find((o: any) => o.orderId === selectedOrderId), [data, selectedOrderId]);

  const riskScore = order?.fraudScore ?? data?.profile?.risk_score;
  const fraudFlags: string[] = order?.fraudFlags ?? data?.profile?.fraud_flags ?? [];

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

  function showMsg(msg: string, tone: 'success' | 'error') {
    setMessage(msg);
    setMessageTone(tone);
  }

  async function onClaim() {
    // Validate order reference (picker selection or manual entry)
    const effectiveRef = manualMode ? manualOrderRef.trim() : selectedOrderId;
    if (!effectiveRef) {
      showMsg(manualMode ? 'Please enter an order reference to continue' : 'Select an order before saving the claim.', 'error');
      return;
    }
    setState('busy');

    let claimOrderSource: string;
    let claimShopifyOrderId: string | null;
    let claimOrderRef: string | null;
    let claimShopDomain: string | null;

    if (manualMode) {
      claimOrderSource = manualOrderSource;
      claimShopifyOrderId = null;
      claimOrderRef = effectiveRef;
      claimShopDomain = null;
    } else {
      claimOrderSource = selectedOrder?.source ?? (shopDomain ? 'shopify' : 'audit');
      claimShopifyOrderId = claimOrderSource === 'shopify' ? selectedOrderId : null;
      claimOrderRef = claimOrderSource !== 'shopify' ? selectedOrderId : null;
      claimShopDomain = shopDomain || null;
    }

    const parsedValue = orderValue ? parseFloat(orderValue) : null;
    const amountAtRisk = parsedValue !== null && !isNaN(parsedValue) && parsedValue > 0 ? parsedValue : null;
    const orderCurrency = selectedOrder?.currency ?? null;

    const r = await submitClaim({
      id: claimId || undefined,
      shop_domain: claimShopDomain,
      shopify_order_id: claimShopifyOrderId,
      order_source: claimOrderSource,
      order_ref: claimOrderRef,
      customer_id: profileId,
      claim_type: claimType,
      customer_claim_reason: customerReason,
      normalized_reason: notes,
      status: 'under_review',
      amount_at_risk: amountAtRisk,
      currency: amountAtRisk ? (orderCurrency ?? null) : null,
    });
    setState('idle');
    showMsg(r.message, r.claimId ? 'success' : 'error');
    if (r.claimId) {
      setClaimId(r.claimId);
      saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId: r.claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, manualOrderRef, manualOrderSource, manualModeExplicit, orderValue });
    }
    await refreshHistory();
  }

  async function onOutcome() {
    if (!claimId) {
      showMsg('Save a claim first, then record the outcome.', 'error');
      return;
    }
    setState('busy');
    const r = await submitOutcome(claimId, { decision, outcome, notes });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('saved') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('saved')) {
      saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows });
    }
    await refreshHistory();
  }

  async function onEvidence() {
    if (!claimId) {
      showMsg('Save a claim first, then attach evidence.', 'error');
      return;
    }
    setState('busy');
    const r = await submitEvidence(claimId, { evidence_type: evidenceType, source, evidence_url: evidenceUrl || null, evidence_hash: evidenceHash || null, metadata });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('saved') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('saved')) {
      saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows });
    }
  }

  const busy = state === 'busy';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Toast */}
      {message && (
        <div className="sticky top-4 z-30">
          <p
            className="text-sm px-4 py-2.5 rounded-lg border shadow-sm flex items-center gap-2"
            style={{
              color: messageTone === 'success' ? '#166534' : messageTone === 'error' ? '#991b1b' : 'var(--text-muted)',
              borderColor: messageTone === 'success' ? '#86efac' : messageTone === 'error' ? '#fca5a5' : 'var(--border-subtle)',
              background: messageTone === 'success' ? '#dcfce7' : messageTone === 'error' ? '#fee2e2' : 'var(--bg-surface)',
            }}
          >
            <span className="flex-1">{message}</span>
            <button onClick={() => setMessage('')} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </p>
        </div>
      )}

      <div className="flex items-start justify-between">
        <h1 className="text-heading-lg">Claim Review</h1>
        {claimId && <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>Claim {claimId.slice(0, 8)}…</span>}
      </div>

      {/* Risk summary */}
      <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Customer risk summary</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Risk score</p>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>
              {riskScore != null ? formatRiskScore(riskScore) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Linked accounts</p>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>
              {data?.linkedAccounts?.length ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Refund/fulfilment</p>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>
              {order?.refundStatus ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Previous claims</p>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>
              {history.length}
            </p>
          </div>
        </div>
        {fraudFlags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {fraudFlags.slice(0, 5).map((f) => (
              <span
                key={f}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                style={{ background: 'var(--sev-medium-fill, #FEF3C7)', color: 'var(--sev-medium, #B45309)' }}
              >
                {signalLabel(f).short}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Context: shop + order picker */}
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Order context</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shops.length > 0 && (
            <div>
              <FieldLabel>Connected shop</FieldLabel>
              {shops.length <= 1
                ? <input className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle()} value={shopDomain} readOnly />
                : (
                  <select className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle()} value={shopDomain} onChange={e => setShopDomain(e.target.value)}>
                    {shops.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
            </div>
          )}
          <div className={shops.length > 0 ? '' : 'md:col-span-2'}>
            <FieldLabel>Order</FieldLabel>
            {!manualMode && orderOptions.length > 0 ? (
              <>
                <select
                  aria-label="Order"
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={inputStyle()}
                  value={selectedOrderId}
                  onChange={e => setSelectedOrderId(e.target.value)}
                >
                  {orderOptions.length > 1 && <option value="">Select an order…</option>}
                  {orderOptions.map((o) => (
                    <option key={o.id} value={o.id}>{formatOrderOption(o)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setManualModeExplicit(true)}
                  className="mt-1 text-xs hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Enter reference manually
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <input
                  className="w-full px-3 py-2 rounded-md text-sm"
                  style={inputStyle()}
                  placeholder="Order reference (e.g. #1001)"
                  value={manualOrderRef}
                  onChange={e => setManualOrderRef(e.target.value)}
                />
                <div>
                  <FieldLabel>Order source</FieldLabel>
                  <select
                    className="w-full px-3 py-2 rounded-md text-sm"
                    style={inputStyle()}
                    value={manualOrderSource}
                    onChange={e => setManualOrderSource(e.target.value)}
                  >
                    <option value="manual">Manual entry</option>
                    <option value="csv">CSV import</option>
                    <option value="shopify">Shopify</option>
                    <option value="audit">Audit</option>
                  </select>
                </div>
                {orderOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setManualModeExplicit(false)}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ← Back to order list
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Claim form */}
        <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Claim details</p>
          <div className="space-y-3">
            <div>
              <FieldLabel>Claim type</FieldLabel>
              <select
                className="w-full px-3 py-2 rounded-md text-sm"
                style={inputStyle()}
                value={claimType}
                onChange={e => setClaimType(e.target.value as ClaimType)}
              >
                {(Object.entries(CLAIM_TYPE_LABELS) as [ClaimType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Customer&apos;s reason</FieldLabel>
              <textarea
                className="w-full px-3 py-2 rounded-md text-sm resize-none"
                style={inputStyle()}
                rows={2}
                placeholder="What the customer claimed, in their words"
                value={customerReason}
                onChange={e => setCustomerReason(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Internal notes</FieldLabel>
              <textarea
                className="w-full px-3 py-2 rounded-md text-sm resize-none"
                style={inputStyle()}
                rows={2}
                placeholder="Your assessment, context, or next steps"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Order value (optional)</FieldLabel>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 rounded-md text-sm"
                style={inputStyle()}
                placeholder="0.00"
                value={orderValue}
                onChange={e => setOrderValue(e.target.value)}
              />
            </div>
            <button
              onClick={onClaim}
              disabled={busy}
              className="w-full px-4 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              {busy ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</> : claimId ? 'Update claim' : 'Save claim'}
            </button>
          </div>
        </section>

        {/* Decision */}
        <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Resolve claim</p>
          <div className="space-y-3">
            <div>
              <FieldLabel>Decision</FieldLabel>
              <select
                className="w-full px-3 py-2 rounded-md text-sm"
                style={inputStyle()}
                value={decision}
                onChange={e => setDecision(e.target.value as Decision)}
              >
                {(Object.entries(DECISION_LABELS) as [Decision, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Outcome</FieldLabel>
              <select
                className="w-full px-3 py-2 rounded-md text-sm"
                style={inputStyle()}
                value={outcome}
                onChange={e => setOutcome(e.target.value as Outcome)}
              >
                {(Object.entries(OUTCOME_LABELS) as [Outcome, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {!claimId && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Save a claim first to record the outcome.</p>
            )}
            <button
              onClick={onOutcome}
              disabled={busy || !claimId}
              className="w-full px-4 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: claimId ? 'var(--accent)' : 'var(--bg-inset)', color: claimId ? 'var(--text-inverse)' : 'var(--text-muted)', border: claimId ? 'none' : '1px solid var(--border)' }}
            >
              {busy ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</> : 'Save outcome'}
            </button>
          </div>
        </section>
      </div>

      {/* Evidence */}
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Evidence</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Evidence type</FieldLabel>
            <select className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle()} value={evidenceType} onChange={e => setEvidenceType(e.target.value as EvidenceType)}>
              {(Object.entries(EVIDENCE_TYPE_LABELS) as [EvidenceType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Source</FieldLabel>
            <select className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle()} value={source} onChange={e => setSource(e.target.value as EvidenceSource)}>
              {(Object.entries(EVIDENCE_SOURCE_LABELS) as [EvidenceSource, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Evidence URL (optional)</FieldLabel>
            <input
              className="w-full px-3 py-2 rounded-md text-sm"
              style={inputStyle()}
              placeholder="https://…"
              value={evidenceUrl}
              onChange={e => setEvidenceUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowMeta((v) => !v)}
            className="text-xs hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            {showMeta ? '▲ Hide' : '▼ Advanced'} — hash & metadata
          </button>
          {showMeta && (
            <div className="mt-2 space-y-2">
              <div>
                <FieldLabel>Evidence hash (SHA-256)</FieldLabel>
                <input className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle()} placeholder="sha256:…" value={evidenceHash} onChange={e => setEvidenceHash(e.target.value)} />
              </div>
              <div className="space-y-2">
                {metaRows.map((r, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input className="px-3 py-2 rounded-md text-sm" style={inputStyle()} placeholder="key" value={r.key} onChange={e => setMetaRows(prev => prev.map((x, ix) => ix === i ? { ...x, key: e.target.value } : x))} />
                    <input className="px-3 py-2 rounded-md text-sm" style={inputStyle()} placeholder="value" value={r.value} onChange={e => setMetaRows(prev => prev.map((x, ix) => ix === i ? { ...x, value: e.target.value } : x))} />
                  </div>
                ))}
                <button onClick={() => setMetaRows(prev => [...prev, { key: '', value: '' }])} className="px-3 py-1 rounded-md text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>+ Add metadata row</button>
              </div>
            </div>
          )}
        </div>

        {!claimId && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Save a claim first to attach evidence.</p>
        )}
        <button
          onClick={onEvidence}
          disabled={busy || !claimId}
          className="mt-3 w-full px-4 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: claimId ? 'var(--accent)' : 'var(--bg-inset)', color: claimId ? 'var(--text-inverse)' : 'var(--text-muted)', border: claimId ? 'none' : '1px solid var(--border)' }}
        >
          {busy ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</> : 'Save evidence'}
        </button>
      </section>

      {/* Claim History */}
      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Claim history</p>
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No claims recorded for this customer yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left py-2 pr-3 text-xs font-semibold">Order ref</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold">Status</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold">Type</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold">Decision / Outcome</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold">At risk</th>
                  <th className="text-left py-2 text-xs font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    className="border-t cursor-pointer hover:bg-[var(--bg-subtle)]"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    onClick={() => setClaimId(h.id)}
                  >
                    <td className="py-2 pr-3 font-mono text-xs">{h.shopify_order_id ?? h.order_ref ?? '—'}</td>
                    <td className="py-2 pr-3"><StatusPill status={h.status} /></td>
                    <td className="py-2 pr-3">{CLAIM_TYPE_LABELS[h.claim_type as ClaimType] ?? h.claim_type}</td>
                    <td className="py-2 pr-3">
                      {h.latest_outcome
                        ? `${DECISION_LABELS[h.latest_outcome.decision as Decision] ?? h.latest_outcome.decision} / ${OUTCOME_LABELS[h.latest_outcome.outcome as Outcome] ?? h.latest_outcome.outcome}`
                        : '—'}
                    </td>
                    <td className="py-2 pr-3">{h.amount_at_risk != null ? formatMoney(h.amount_at_risk, h.currency) : '—'}</td>
                    <td className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {h.updated_at ? new Date(h.updated_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
