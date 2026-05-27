'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  recordCustomerResponseCopied,
  reopenClaim,
  reverseClaimDecision,
  submitClaim,
  submitEvidence,
  submitOutcome,
  updateClaimStatus as submitClaimStatus,
} from '@/lib/claims/workflowClient';
import { signalLabel } from '@/lib/copy/signalLabels';
import { formatRiskScore } from '@/lib/utils/format';
import { buildCustomerResponse } from '@/lib/claims/customerResponses';
import { claimEventLabel } from '@/lib/claims/events';
import {
  ACTIVE_CLAIM_STATUSES,
  formatClaimAge,
  formatFiledDate,
  getClaimSlaState,
  isFinalClaimStatus,
} from '@/lib/claims/sla';

type ClaimType = 'missing_parcel' | 'damaged' | 'wrong_item' | 'refund_request' | 'chargeback' | 'return_abuse' | 'other';
type Decision = 'approved' | 'denied' | 'escalated' | 'partial_refund' | 'full_refund' | 'chargeback_disputed' | 'blacklist' | 'no_action';
type Outcome = 'loss' | 'recovered' | 'pending' | 'chargeback_won' | 'chargeback_lost' | 'customer_verified' | 'suspected_fraud' | 'legitimate';
type EvidenceType = 'tracking' | 'proof_of_delivery' | 'customer_message' | 'support_ticket' | 'return_label' | 'warehouse_scan' | 'payment_dispute' | 'note' | 'other';
type EvidenceSource = 'manual' | 'csv_import' | 'zendesk' | 'gorgias' | 'shopify' | 'stripe' | 'paypal' | 'carrier';
type ClaimStatus = 'open' | 'under_review' | 'evidence_requested' | 'pending' | 'escalated' | 'resolved' | 'closed';

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
  statusToSet: ClaimStatus;
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
  legitimate: 'Legitimate',
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
  pending: 'Pending external evidence',
  escalated: 'Escalated',
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
    pending: { bg: 'var(--sev-medium-fill, #FEF3C7)', text: 'var(--sev-medium, #B45309)' },
    escalated: { bg: 'var(--risk-critical-bg, #FEE2E2)', text: 'var(--risk-critical, #991B1B)' },
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

function SlaBadge({ claim }: { claim: any }) {
  const sla = getClaimSlaState(claim);
  const colourMap: Record<string, { bg: string; text: string }> = {
    normal: { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
    approaching: { bg: 'var(--sev-medium-fill, #FEF3C7)', text: 'var(--sev-medium, #B45309)' },
    overdue: { bg: 'var(--sev-high-fill, #FEE2E2)', text: 'var(--sev-high, #991B1B)' },
    resolved: { bg: 'var(--sev-clear-fill, #DCFCE7)', text: 'var(--sev-clear, #166534)' },
  };
  const c = colourMap[sla.state] ?? colourMap.normal;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {sla.label}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{children}</label>;
}

function inputStyle(): React.CSSProperties {
  return { border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' };
}

export default function ClaimReviewPanel({ profileId, initialClaimId }: { profileId: string; initialClaimId?: string | null }) {
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
  const [statusToSet, setStatusToSet] = useState<ClaimStatus>('pending');
  const [statusNote, setStatusNote] = useState('');
  const [reopenNote, setReopenNote] = useState('');
  const [reverseDecision, setReverseDecision] = useState<Decision>('approved');
  const [reverseOutcome, setReverseOutcome] = useState<Outcome>('legitimate');
  const [reverseNote, setReverseNote] = useState('');
  const [nextClaimHref, setNextClaimHref] = useState<string | null>(null);
  const [noMoreClaims, setNoMoreClaims] = useState(false);
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
    if (typeof draft.statusToSet === 'string') setStatusToSet(draft.statusToSet as ClaimStatus);
  }, [profileId]);

  useEffect(() => {
    saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, manualOrderRef, manualOrderSource, manualModeExplicit, orderValue, statusToSet });
  }, [profileId, selectedOrderId, claimType, customerReason, notes, claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, manualOrderRef, manualOrderSource, manualModeExplicit, orderValue, statusToSet]);

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
  const selectedClaim = useMemo(() => history.find((h) => h.id === claimId) ?? null, [claimId, history]);
  const selectedClaimOutcomes = useMemo(() => selectedClaim?.outcomes ?? [], [selectedClaim]);
  const latestOutcome = selectedClaimOutcomes[0] ?? selectedClaim?.latest_outcome ?? null;
  const previousOutcome = selectedClaimOutcomes[1] ?? null;
  const selectedClaimEvents = selectedClaim?.events ?? [];
  const customerResponse = useMemo(
    () => buildCustomerResponse({ decision: latestOutcome?.decision, outcome: latestOutcome?.outcome, status: selectedClaim?.status }),
    [latestOutcome, selectedClaim],
  );

  useEffect(() => {
    if (!initialClaimId || claimId || history.length === 0) return;
    if (history.some((h) => h.id === initialClaimId)) setClaimId(initialClaimId);
  }, [claimId, history, initialClaimId]);

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

  const effectiveOrderRef = manualMode ? manualOrderRef.trim() : selectedOrderId;
  const duplicateClaim = useMemo(() => {
    if (!effectiveOrderRef) return null;
    return history.find((h) => {
      if (h.id === claimId) return false;
      const orderRef = String(h.shopify_order_id ?? h.order_ref ?? '');
      return orderRef === effectiveOrderRef && h.claim_type === claimType;
    }) ?? null;
  }, [claimId, claimType, effectiveOrderRef, history]);
  const activeDuplicateClaim = duplicateClaim && ACTIVE_CLAIM_STATUSES.includes(duplicateClaim.status as any) ? duplicateClaim : null;
  const resolvedDuplicateClaim = duplicateClaim && isFinalClaimStatus(duplicateClaim.status) ? duplicateClaim : null;

  async function refreshHistory() {
    const x = await fetch(`/api/claims?profileId=${encodeURIComponent(profileId)}`).then(r => r.ok ? r.json() : null).catch(() => null);
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
    if (activeDuplicateClaim) {
      setClaimId(activeDuplicateClaim.id);
      showMsg(`An active ${CLAIM_TYPE_LABELS[claimType].toLowerCase()} claim already exists for this order.`, 'error');
      return;
    }
    if (resolvedDuplicateClaim) {
      setClaimId(resolvedDuplicateClaim.id);
      showMsg(`A resolved ${CLAIM_TYPE_LABELS[claimType].toLowerCase()} claim already exists for this order. Reopen the existing claim if new evidence changes the decision.`, 'error');
      return;
    }
    setNextClaimHref(null);
    setNoMoreClaims(false);
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
      saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId: r.claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, manualOrderRef, manualOrderSource, manualModeExplicit, orderValue, statusToSet });
    } else if (r.duplicateClaimId) {
      setClaimId(r.duplicateClaimId);
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
      saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, statusToSet });
      const next = await fetch(`/api/claims?queue=active&sort=age&limit=1&excludeId=${encodeURIComponent(claimId)}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);
      const nextClaim = next?.claims?.[0];
      if (nextClaim?.customer_id) {
        setNextClaimHref(`/customers/${nextClaim.customer_id}/claims?claimId=${nextClaim.id}`);
        setNoMoreClaims(false);
      } else {
        setNextClaimHref(null);
        setNoMoreClaims(true);
      }
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
      saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, statusToSet });
    }
    await refreshHistory();
  }

  async function onStatusChange() {
    if (!claimId) {
      showMsg('Save or select a claim before changing status.', 'error');
      return;
    }
    if (!statusNote.trim()) {
      showMsg('Add a short note before changing status.', 'error');
      return;
    }
    setState('busy');
    const r = await submitClaimStatus(claimId, { status: statusToSet, note: statusNote });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('updated') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('updated')) setStatusNote('');
    await refreshHistory();
  }

  async function onReopen() {
    if (!claimId) {
      showMsg('Select a resolved claim before reopening.', 'error');
      return;
    }
    if (!reopenNote.trim()) {
      showMsg('Add a reason before reopening the claim.', 'error');
      return;
    }
    setState('busy');
    const r = await reopenClaim(claimId, { note: reopenNote });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('reopened') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('reopened')) setReopenNote('');
    await refreshHistory();
  }

  async function onReverse() {
    if (!claimId) {
      showMsg('Select a resolved claim before reversing a decision.', 'error');
      return;
    }
    if (!reverseNote.trim()) {
      showMsg('Add a reason before reversing the decision.', 'error');
      return;
    }
    setState('busy');
    const r = await reverseClaimDecision(claimId, { decision: reverseDecision, outcome: reverseOutcome, note: reverseNote });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('reversed') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('reversed')) setReverseNote('');
    await refreshHistory();
  }

  async function onCopyCustomerResponse() {
    if (!claimId) return;
    try {
      await navigator.clipboard.writeText(customerResponse);
      await recordCustomerResponseCopied(claimId, { decision: latestOutcome?.decision ?? null, outcome: latestOutcome?.outcome ?? null });
      showMsg('Customer response copied', 'success');
      await refreshHistory();
    } catch {
      showMsg('Copy unavailable in this browser. Select the response text and copy manually.', 'error');
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

      {selectedClaim && (
        <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-overline mb-2" style={{ color: 'var(--text-muted)' }}>Selected claim</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs" style={{ color: 'var(--text)' }}>{selectedClaim.shopify_order_id ?? selectedClaim.order_ref ?? selectedClaim.id.slice(0, 8)}</span>
                <StatusPill status={selectedClaim.status} />
                <SlaBadge claim={selectedClaim} />
              </div>
            </div>
            <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
              <p>Filed {formatFiledDate(selectedClaim)}</p>
              <p>{formatClaimAge(selectedClaim)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Current decision</p>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>
                {latestOutcome ? DECISION_LABELS[latestOutcome.decision as Decision] ?? latestOutcome.decision : '—'}
              </p>
              {latestOutcome?.actor_user_id && (
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Actor {String(latestOutcome.actor_user_id).slice(0, 8)}</p>
              )}
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Current outcome</p>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>
                {latestOutcome ? OUTCOME_LABELS[latestOutcome.outcome as Outcome] ?? latestOutcome.outcome : '—'}
              </p>
              {latestOutcome?.updated_at && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(latestOutcome.updated_at).toLocaleString('en-GB')}</p>
              )}
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Previous outcome</p>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>
                {previousOutcome
                  ? `${DECISION_LABELS[previousOutcome.decision as Decision] ?? previousOutcome.decision} / ${OUTCOME_LABELS[previousOutcome.outcome as Outcome] ?? previousOutcome.outcome}`
                  : '—'}
              </p>
              {previousOutcome?.updated_at && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(previousOutcome.updated_at).toLocaleString('en-GB')}</p>
              )}
            </div>
          </div>
        </section>
      )}

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
            {activeDuplicateClaim && (
              <div className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: '#fca5a5', background: '#fee2e2', color: '#991b1b' }}>
                An active {CLAIM_TYPE_LABELS[claimType].toLowerCase()} claim already exists for this order.
                <button type="button" onClick={() => setClaimId(activeDuplicateClaim.id)} className="ml-2 font-semibold underline">Open existing review</button>
              </div>
            )}
            {resolvedDuplicateClaim && (
              <div className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)', color: 'var(--text)' }}>
                A resolved {CLAIM_TYPE_LABELS[claimType].toLowerCase()} claim already exists for this order. Reopen the old claim if new evidence changes the decision.
                <button type="button" onClick={() => setClaimId(resolvedDuplicateClaim.id)} className="ml-2 font-semibold underline" style={{ color: 'var(--accent)' }}>Open resolved claim</button>
              </div>
            )}
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
            {(nextClaimHref || noMoreClaims) && (
              <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  {nextClaimHref ? (
                    <a href={nextClaimHref} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>
                      Next claim
                    </a>
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>No more open claims in this queue.</span>
                  )}
                  <a href="/claims?status=open" className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                    Back to queue
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Status and follow-up</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <FieldLabel>Set status</FieldLabel>
            <select className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle()} value={statusToSet} onChange={e => setStatusToSet(e.target.value as ClaimStatus)}>
              <option value="open">Open</option>
              <option value="under_review">Under review</option>
              <option value="evidence_requested">Evidence requested</option>
              <option value="pending">Pending external evidence</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <textarea className="w-full px-3 py-2 rounded-md text-sm resize-none" style={inputStyle()} rows={2} placeholder="Status note" value={statusNote} onChange={e => setStatusNote(e.target.value)} />
            <button onClick={onStatusChange} disabled={busy || !claimId} className="w-full px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-60" style={{ background: claimId ? 'var(--accent)' : 'var(--bg-inset)', color: claimId ? 'var(--text-inverse)' : 'var(--text-muted)' }}>
              Update status
            </button>
          </div>
          <div className="space-y-2">
            <FieldLabel>Reopen resolved claim</FieldLabel>
            <textarea className="w-full px-3 py-2 rounded-md text-sm resize-none" style={inputStyle()} rows={3} placeholder="Reason for reopening" value={reopenNote} onChange={e => setReopenNote(e.target.value)} />
            <button onClick={onReopen} disabled={busy || !claimId || !selectedClaim || !isFinalClaimStatus(selectedClaim.status)} className="w-full px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-60" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
              Reopen claim
            </button>
          </div>
          <div className="space-y-2">
            <FieldLabel>Reverse decision</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <select className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle()} value={reverseDecision} onChange={e => setReverseDecision(e.target.value as Decision)}>
                {(Object.entries(DECISION_LABELS) as [Decision, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select className="w-full px-3 py-2 rounded-md text-sm" style={inputStyle()} value={reverseOutcome} onChange={e => setReverseOutcome(e.target.value as Outcome)}>
                {(Object.entries(OUTCOME_LABELS) as [Outcome, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <textarea className="w-full px-3 py-2 rounded-md text-sm resize-none" style={inputStyle()} rows={2} placeholder="Reason for reversal" value={reverseNote} onChange={e => setReverseNote(e.target.value)} />
            <button onClick={onReverse} disabled={busy || !claimId || !latestOutcome} className="w-full px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-60" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
              Reverse decision
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-overline" style={{ color: 'var(--text-muted)' }}>Customer response</p>
          <button onClick={onCopyCustomerResponse} disabled={!claimId} className="px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
            Copy
          </button>
        </div>
        <textarea className="w-full px-3 py-2 rounded-md text-sm resize-none" style={inputStyle()} rows={3} value={customerResponse} readOnly />
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Internal notes and risk signals stay out of the customer-facing response.</p>
      </section>

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
                  <th className="text-left py-2 pr-3 text-xs font-semibold">Filed</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold">SLA</th>
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
                    <td className="py-2 pr-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{formatFiledDate(h)}</span>
                      <span className="block">{formatClaimAge(h)}</span>
                    </td>
                    <td className="py-2 pr-3"><SlaBadge claim={h} /></td>
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

      <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Event timeline</p>
        {!selectedClaim ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a claim to view its audit history.</p>
        ) : selectedClaimEvents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No claim events recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {selectedClaimEvents.map((event: any) => (
              <li key={event.id} className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{claimEventLabel(event.event_type)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {[event.previous_status && event.new_status ? `${STATUS_LABELS[event.previous_status] ?? event.previous_status} → ${STATUS_LABELS[event.new_status] ?? event.new_status}` : null,
                        event.previous_decision && event.new_decision ? `${DECISION_LABELS[event.previous_decision as Decision] ?? event.previous_decision} → ${DECISION_LABELS[event.new_decision as Decision] ?? event.new_decision}` : null,
                        event.previous_outcome && event.new_outcome ? `${OUTCOME_LABELS[event.previous_outcome as Outcome] ?? event.previous_outcome} → ${OUTCOME_LABELS[event.new_outcome as Outcome] ?? event.new_outcome}` : null,
                      ].filter(Boolean).join(' · ') || 'Claim action recorded'}
                    </p>
                    {event.note && <p className="mt-1 text-sm" style={{ color: 'var(--text)' }}>{event.note}</p>}
                  </div>
                  <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                    <p>{event.created_at ? new Date(event.created_at).toLocaleString('en-GB') : '—'}</p>
                    {event.actor_user_id && <p className="font-mono">Actor {String(event.actor_user_id).slice(0, 8)}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
