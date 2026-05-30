'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  recordCustomerResponseCopied,
  assignClaim,
  markClaimViewed,
  reopenClaim,
  reverseClaimDecision,
  snoozeClaim,
  submitClaim,
  submitEvidence,
  submitOutcome,
  updateClaimStatus as submitClaimStatus,
} from '@/lib/claims/workflowClient';
import { signalLabel } from '@/lib/copy/signalLabels';
import { formatRiskScore } from '@/lib/utils/format';
import { buildCustomerResponse } from '@/lib/claims/customerResponses';
import { claimEventLabel, claimEventSummary, claimHasEvidence } from '@/lib/claims/events';
import { pickPriorityClaim } from '@/lib/claims/priority';
import SupportCaseContextList from '@/components/support/SupportCaseContextList';
import type { PublicSupportCaseContext } from '@/lib/support/intake/supportCaseReadModel';
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
  approved: 'Merchant approved claim',
  denied: 'Merchant declined claim',
  escalated: 'Escalated for review',
  partial_refund: 'Partial refund',
  full_refund: 'Full refund',
  chargeback_disputed: 'Chargeback disputed',
  blacklist: 'Added to merchant watchlist',
  no_action: 'No action',
};

const OUTCOME_LABELS: Record<Outcome, string> = {
  loss: 'Loss accepted',
  recovered: 'Recovered',
  pending: 'Pending',
  chargeback_won: 'Chargeback won',
  chargeback_lost: 'Chargeback lost',
  customer_verified: 'Customer verified',
  suspected_fraud: 'Pattern suggests misuse',
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

export function shouldAttemptClaimViewed(
  claimId: string | null | undefined,
  firstViewedAt: string | null | undefined,
  attemptedIds: Set<string>,
) {
  if (!claimId) return false;
  if (firstViewedAt) return false;
  if (attemptedIds.has(claimId)) return false;
  return true;
}

function formatMoney(value: number | null | undefined, _currency?: string | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function formatOrderOption(o: OrderOption) {
  const date = o.date ? new Date(o.date).toLocaleDateString('en-US') : '—';
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

function RailSection({
  id,
  title,
  open,
  onToggle,
  children,
  badge,
  highlighted,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: highlighted ? 'var(--copper-bright)' : 'var(--border-subtle)',
        background: 'var(--bg-surface)',
        boxShadow: highlighted ? '0 0 0 1px var(--copper-bright)' : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{ background: 'var(--bg-surface)' }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--ink-secondary)' }}>{title}</span>
          {badge}
        </span>
        <span className="text-[10px] shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

const QUICK_LIFECYCLE_STATUSES: Array<{ value: ClaimStatus; label: string }> = [
  { value: 'under_review', label: 'Under review' },
  { value: 'evidence_requested', label: 'Awaiting evidence' },
  { value: 'pending', label: 'Awaiting info' },
  { value: 'escalated', label: 'Escalated' },
];

function ClaimLifecycleStatusBar({
  claimId,
  busy,
  claimIsClosed,
  statusToSet,
  setStatusToSet,
  statusNote,
  setStatusNote,
  onStatusChange,
  reopenNote,
  setReopenNote,
  onReopen,
  canReopen,
  submitIsPrimary,
}: {
  claimId: string;
  busy: boolean;
  claimIsClosed: boolean;
  statusToSet: ClaimStatus;
  setStatusToSet: (status: ClaimStatus) => void;
  statusNote: string;
  setStatusNote: (note: string) => void;
  onStatusChange: () => void;
  reopenNote: string;
  setReopenNote: (note: string) => void;
  onReopen: () => void;
  canReopen: boolean;
  submitIsPrimary?: boolean;
}) {
  if (claimIsClosed) {
    return (
      <div className="space-y-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Claim closed — reopen to return to active queue.</p>
        <textarea
          className="w-full px-2 py-1.5 rounded-md text-xs resize-none"
          style={inputStyle()}
          rows={2}
          placeholder="Reason for reopening"
          value={reopenNote}
          onChange={(e) => setReopenNote(e.target.value)}
        />
        <button
          type="button"
          onClick={onReopen}
          disabled={busy || !claimId || !canReopen}
          className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60"
          style={btnStyle(submitIsPrimary ? 'primary' : 'secondary')}
        >
          Reopen claim
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <FieldLabel>Status</FieldLabel>
        <select
          className="w-full px-2 py-1.5 rounded-md text-xs"
          style={inputStyle()}
          value={statusToSet}
          onChange={(e) => setStatusToSet(e.target.value as ClaimStatus)}
          aria-label="Claim lifecycle status"
        >
          {(Object.entries(STATUS_LABELS) as [ClaimStatus, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <FieldLabel>Status note (required)</FieldLabel>
        <input
          type="text"
          className="w-full px-2 py-1.5 rounded-md text-xs"
          style={inputStyle()}
          placeholder="e.g. Awaiting carrier POD"
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={onStatusChange}
        disabled={busy || !claimId}
        className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60"
        style={btnStyle(submitIsPrimary && claimId ? 'primary' : claimId ? 'secondary' : 'disabled')}
      >
        Update status
      </button>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Quick status shortcuts">
        {QUICK_LIFECYCLE_STATUSES.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={busy || !claimId}
            onClick={() => setStatusToSet(item.value)}
            className="rounded-md border px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50"
            style={{
              borderColor: statusToSet === item.value ? 'var(--accent)' : 'var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: statusToSet === item.value ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return { border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' };
}

type PrimaryActionKey = 'evidence' | 'decision' | 'response' | 'status' | 'close' | 'save_claim' | 'reopen' | 'none';

function resolvePrimaryAction(
  claim: any,
  hasEvidence: boolean,
  hasDecision: boolean,
  responseRecorded: boolean,
  claimIsClosed: boolean,
  claimId: string,
): { key: PrimaryActionKey; label: string; reason: string; cta: string; railSection: string | null } {
  if (!claimId) {
    return { key: 'save_claim', label: 'Create claim record', reason: 'Save claim details before adding evidence or recording a decision.', cta: 'Create claim', railSection: null };
  }
  if (!claim) {
    return { key: 'none', label: 'Select a claim', reason: 'Choose a claim from the header switcher or queue.', cta: '—', railSection: null };
  }
  if (claimIsClosed) {
    return { key: 'reopen', label: 'Reopen for review', reason: 'This claim is closed. Reopen it to return it to the active queue.', cta: 'Reopen claim', railSection: 'status' };
  }
  if (!hasEvidence) {
    return { key: 'evidence', label: 'Add delivery evidence', reason: 'Evidence on record helps the merchant decide with context.', cta: 'Save evidence', railSection: 'evidence' };
  }
  if (!hasDecision) {
    return { key: 'decision', label: 'Record merchant decision', reason: 'Evidence is on record. Capture the merchant outcome for this claim.', cta: 'Record merchant decision', railSection: 'decision' };
  }
  if (!responseRecorded) {
    return { key: 'response', label: 'Copy customer response', reason: 'Decision recorded. Send or log the customer-facing response.', cta: 'Copy & record response', railSection: 'response' };
  }
  if (!isFinalClaimStatus(claim.status)) {
    return { key: 'status', label: 'Close claim', reason: 'Decision and response are recorded. Update status to resolved or closed.', cta: 'Update status', railSection: 'status' };
  }
  return { key: 'close', label: 'Work complete', reason: 'This case is ready to leave the active queue.', cta: 'Next claim', railSection: null };
}

function btnStyle(variant: 'primary' | 'secondary' | 'muted' | 'disabled'): React.CSSProperties {
  if (variant === 'primary') return { background: 'var(--accent)', color: 'var(--text-inverse)' };
  if (variant === 'muted') return { border: '1px solid var(--border-subtle)', background: 'var(--bg-inset)', color: 'var(--text-muted)' };
  if (variant === 'disabled') return { border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-muted)' };
  return { border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text)' };
}

function CaseIntelTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border px-3 py-2.5 min-w-0" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{children}</div>
    </div>
  );
}

function statusNextAction(claim: any, hasDecision: boolean, responseRecorded: boolean) {
  if (!claim) return 'Select or save a claim';
  if (claim.status === 'open') return 'Review evidence';
  if (claim.status === 'pending' || claim.status === 'evidence_requested') return 'Check requested evidence';
  if (claim.status === 'escalated') return 'Review escalation';
  if (!hasDecision) return 'Record merchant decision';
  if (!responseRecorded) return 'Record customer response';
  if (isFinalClaimStatus(claim.status)) return 'Work complete';
  return 'Close claim';
}

function identityEvidencePoints(data: any, order: any, fraudFlags: string[]) {
  const points: string[] = [];
  const emails = Array.isArray(data?.profile?.emails) ? data.profile.emails.length : 0;
  const addresses = Array.isArray(data?.profile?.addresses) ? data.profile.addresses.length : 0;
  const ips = Array.isArray(data?.profile?.ips) ? data.profile.ips.length : 0;
  const cards = Array.isArray(data?.profile?.card_last4s) ? data.profile.card_last4s.length : 0;
  if (emails > 1) points.push(`${emails} email variants`);
  if (addresses > 1) points.push(`${addresses} address variants`);
  if (ips > 1 || order?.ip) points.push('IP/device overlap');
  if (cards > 0) points.push('Payment card signal');
  if (fraudFlags.length > 0) points.push(`${Math.min(fraudFlags.length, 5)} behaviour signals`);
  return points.slice(0, 5);
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
  const [claimId, setClaimId] = useState(initialClaimId ?? '');
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
  const [actionTab, setActionTab] = useState<'resolve' | 'escalate'>('resolve');
  const [auditTab, setAuditTab] = useState<'timeline' | 'history'>('timeline');
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [railOpen, setRailOpen] = useState<Record<string, boolean>>({
    ownership: false,
    status: false,
    snooze: false,
    evidence: false,
    decision: false,
    response: false,
    advanced: false,
  });
  // Manual order entry (Fix 2)
  const [manualOrderRef, setManualOrderRef] = useState('');
  const [manualOrderSource, setManualOrderSource] = useState('manual');
  const [manualModeExplicit, setManualModeExplicit] = useState(false);
  // Order value for amount_at_risk (Fix 4)
  const [orderValue, setOrderValue] = useState('');
  const [snoozeDays, setSnoozeDays] = useState('2');
  const [snoozeReason, setSnoozeReason] = useState('Awaiting carrier or customer evidence');
  const viewedAttemptedRef = useRef<Set<string>>(new Set());
  const [supportCases, setSupportCases] = useState<PublicSupportCaseContext[]>([]);

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
  const activeClaimId = selectedClaim?.id ?? claimId;

  useEffect(() => {
    if (!activeClaimId) {
      setSupportCases([]);
      return;
    }
    fetch(`/api/claims/${encodeURIComponent(activeClaimId)}/support-context`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setSupportCases(payload?.support_cases ?? []))
      .catch(() => setSupportCases([]));
  }, [activeClaimId]);
  const selectedClaimOutcomes = useMemo(() => selectedClaim?.outcomes ?? [], [selectedClaim]);
  const latestOutcome = selectedClaimOutcomes[0] ?? selectedClaim?.latest_outcome ?? null;
  const previousOutcome = selectedClaimOutcomes[1] ?? null;
  const selectedClaimEvents = selectedClaim?.events ?? [];
  const customerResponse = useMemo(
    () => buildCustomerResponse({ decision: latestOutcome?.decision, outcome: latestOutcome?.outcome, status: selectedClaim?.status }),
    [latestOutcome, selectedClaim],
  );
  const responseRecorded = selectedClaimEvents.some((event: any) => event.event_type === 'customer_response_copied');
  const evidenceRecorded = claimHasEvidence({ evidence_count: selectedClaim?.evidence_count, events: selectedClaimEvents });
  const claimIsClosed = selectedClaim ? isFinalClaimStatus(selectedClaim.status) : false;

  useEffect(() => {
    if (initialClaimId) setClaimId(initialClaimId);
  }, [initialClaimId]);

  useEffect(() => {
    if (history.length === 0 || claimId) return;
    const priority = pickPriorityClaim(history, initialClaimId ?? null);
    if (!priority) return;
    setClaimId(priority.id);
  }, [claimId, history, initialClaimId]);

  // Open claim form when no claim is selected yet
  useEffect(() => {
    if (!claimId) setClaimFormOpen(true);
  }, [claimId]);

  // Smart accordion defaults based on claim state
  useEffect(() => {
    if (!selectedClaim) {
      setRailOpen({ ownership: false, status: false, snooze: false, evidence: false, decision: false, response: false, advanced: false });
      return;
    }
    const isClosed = isFinalClaimStatus(selectedClaim.status);
    const hasDecisionNow = !!(selectedClaim.latest_outcome);
    const responseNow = (selectedClaim.events ?? []).some((e: any) => e.event_type === 'customer_response_copied');
    const evidenceNow = claimHasEvidence({ evidence_count: selectedClaim.evidence_count, events: selectedClaim.events ?? [] });
    const awaitingInfo = selectedClaim.status === 'pending' || selectedClaim.status === 'evidence_requested';

    setRailOpen({
      ownership: false,
      status: awaitingInfo,
      snooze: awaitingInfo,
      evidence: !evidenceNow && !isClosed,
      decision: evidenceNow && !hasDecisionNow && !isClosed,
      response: hasDecisionNow && !responseNow && !isClosed,
      advanced: isClosed,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClaim?.id, selectedClaim?.status]);

  useEffect(() => {
    if (!selectedClaim) return;
    if (selectedClaim.claim_type) setClaimType(selectedClaim.claim_type as ClaimType);
    if (selectedClaim.customer_claim_reason) setCustomerReason(selectedClaim.customer_claim_reason);
    if (selectedClaim.normalized_reason) setNotes(selectedClaim.normalized_reason);
    const orderRef = String(selectedClaim.shopify_order_id ?? selectedClaim.order_ref ?? '');
    if (orderRef && orderOptions.some((o) => o.id === orderRef)) {
      setSelectedOrderId(orderRef);
      setManualModeExplicit(false);
    } else if (orderRef) {
      setManualOrderRef(orderRef);
      setManualModeExplicit(true);
    }
    if (selectedClaim.amount_at_risk != null) {
      setOrderValue(String(selectedClaim.amount_at_risk));
    }
    if (selectedClaim.latest_outcome?.decision) {
      setDecision(selectedClaim.latest_outcome.decision as Decision);
    }
    if (selectedClaim.latest_outcome?.outcome) {
      setOutcome(selectedClaim.latest_outcome.outcome as Outcome);
    }
    if (selectedClaim.status) {
      setStatusToSet(selectedClaim.status as ClaimStatus);
    }
  }, [selectedClaim, orderOptions]);

  useEffect(() => {
    if (!shouldAttemptClaimViewed(selectedClaim?.id, selectedClaim?.first_viewed_at, viewedAttemptedRef.current)) {
      return;
    }
    const selectedClaimId = selectedClaim!.id;
    viewedAttemptedRef.current.add(selectedClaimId);
    const viewedAt = new Date().toISOString();
    setHistory((prev) =>
      prev.map((item) =>
        item.id === selectedClaimId ? { ...item, first_viewed_at: item.first_viewed_at ?? viewedAt } : item,
      ),
    );
    void markClaimViewed(selectedClaimId).then((result) => {
      // Only show error for genuine failures, not idempotent already-viewed responses
      const msg = result.message.toLowerCase();
      if (msg.includes('denied') || (msg.includes('failed') && !msg.includes('already'))) {
        showMsg(result.message, 'error');
      }
    });
  }, [selectedClaim?.id, selectedClaim?.first_viewed_at]);

  const riskScore = order?.fraudScore ?? data?.profile?.risk_score;
  const customerName = data?.profile?.names?.[0] ?? data?.profile?.customerName ?? data?.profile?.name ?? 'Customer';
  const customerEmail = data?.profile?.primary_email ?? data?.profile?.primaryEmail ?? data?.profile?.email ?? data?.profile?.customerEmail ?? null;
  const customerProfileHref = `/customers/${profileId}`;
  const fraudFlags: string[] = order?.fraudFlags ?? data?.profile?.fraud_flags ?? [];
  const nextClaimAction = statusNextAction(selectedClaim, !!latestOutcome, responseRecorded);
  const primaryAction = useMemo(
    () => resolvePrimaryAction(selectedClaim, evidenceRecorded, !!latestOutcome, responseRecorded, claimIsClosed, claimId),
    [selectedClaim, evidenceRecorded, latestOutcome, responseRecorded, claimIsClosed, claimId],
  );
  const identityPoints = identityEvidencePoints(data, order, fraudFlags);

  function openRailSection(section: string) {
    setRailOpen((p) => ({ ...p, [section]: true }));
  }

  async function handlePrimaryCta() {
    switch (primaryAction.key) {
      case 'save_claim':
        setClaimFormOpen(true);
        break;
      case 'evidence':
        openRailSection('evidence');
        break;
      case 'decision':
        openRailSection('decision');
        break;
      case 'response':
        openRailSection('response');
        await onCopyCustomerResponse();
        break;
      case 'status':
      case 'reopen':
        openRailSection('status');
        break;
      case 'close':
        if (nextClaimHref) window.location.href = nextClaimHref;
        else openRailSection('status');
        break;
      default:
        break;
    }
  }

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
    if (!activeClaimId) {
      showMsg('Save a claim first, then record the outcome.', 'error');
      return;
    }
    setState('busy');
    const r = await submitOutcome(activeClaimId, { decision, outcome, notes });
    setState('idle');
    if (r.message.toLowerCase().includes('saved')) {
      showMsg(
        decision === 'escalated'
          ? 'Merchant decision recorded. Claim moved to escalated review.'
          : 'Merchant decision recorded. Claim resolved and removed from the active queue.',
        'success',
      );
      saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId: activeClaimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, statusToSet });
      const next = await fetch(`/api/claims?queue=active&sort=age&limit=1&excludeId=${encodeURIComponent(activeClaimId)}`)
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
    } else {
      showMsg(r.message, 'error');
    }
    await refreshHistory();
  }

  async function onEvidence() {
    if (!activeClaimId) {
      showMsg('Save a claim first, then attach evidence.', 'error');
      return;
    }
    setState('busy');
    const r = await submitEvidence(activeClaimId, { evidence_type: evidenceType, source, evidence_url: evidenceUrl || null, evidence_hash: evidenceHash || null, metadata });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('saved') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('saved')) {
      saveClaimDraft(profileId, { selectedOrderId, claimType, customerReason, notes, claimId: activeClaimId, decision, outcome, evidenceType, source, evidenceUrl, evidenceHash, metaRows, statusToSet });
    }
    await refreshHistory();
  }

  async function onStatusChange() {
    if (!activeClaimId) {
      showMsg('Save or select a claim before changing status.', 'error');
      return;
    }
    if (!statusNote.trim()) {
      showMsg('Add a short note before changing status.', 'error');
      return;
    }
    setState('busy');
    const r = await submitClaimStatus(activeClaimId, { status: statusToSet, note: statusNote });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('updated') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('updated')) setStatusNote('');
    await refreshHistory();
  }

  async function onReopen() {
    if (!activeClaimId) {
      showMsg('Select a resolved claim before reopening.', 'error');
      return;
    }
    if (!reopenNote.trim()) {
      showMsg('Add a reason before reopening the claim.', 'error');
      return;
    }
    setState('busy');
    const r = await reopenClaim(activeClaimId, { note: reopenNote });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('reopened') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('reopened')) setReopenNote('');
    await refreshHistory();
  }

  async function onReverse() {
    if (!activeClaimId) {
      showMsg('Select a resolved claim before reversing a decision.', 'error');
      return;
    }
    if (!reverseNote.trim()) {
      showMsg('Add a reason before reversing the decision.', 'error');
      return;
    }
    setState('busy');
    const r = await reverseClaimDecision(activeClaimId, { decision: reverseDecision, outcome: reverseOutcome, note: reverseNote });
    setState('idle');
    showMsg(r.message, r.message.toLowerCase().includes('reversed') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('reversed')) setReverseNote('');
    await refreshHistory();
  }

  async function onCopyCustomerResponse() {
    if (!activeClaimId) return;
    try {
      await navigator.clipboard.writeText(customerResponse);
      await recordCustomerResponseCopied(activeClaimId, { decision: latestOutcome?.decision ?? null, outcome: latestOutcome?.outcome ?? null, responseText: customerResponse });
      showMsg('Customer response copied and recorded on the claim timeline.', 'success');
      await refreshHistory();
    } catch {
      await recordCustomerResponseCopied(activeClaimId, { decision: latestOutcome?.decision ?? null, outcome: latestOutcome?.outcome ?? null, responseText: customerResponse });
      showMsg('Clipboard copy unavailable. Response was still recorded on the claim timeline.', 'success');
      await refreshHistory();
    }
  }

  async function onAssignment(action: 'assign_to_me' | 'unassign') {
    if (!activeClaimId) return;
    setState('busy');
    const r = await assignClaim(activeClaimId, action);
    setState('idle');
    showMsg(r.message, r.message === 'Assignment updated' ? 'success' : 'error');
    await refreshHistory();
  }

  async function onSnooze() {
    if (!activeClaimId) return;
    const days = Math.max(1, Math.min(30, parseInt(snoozeDays, 10) || 2));
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    setState('busy');
    const r = await snoozeClaim(activeClaimId, { snoozed_until: until, reason: snoozeReason });
    setState('idle');
    showMsg(r.message, r.message === 'Follow-up updated' ? 'success' : 'error');
    await refreshHistory();
  }

  const busy = state === 'busy';
  const riskNumeric = riskScore != null ? Math.max(0, Math.min(100, Math.round(Number(riskScore)))) : null;
  const riskBand = riskNumeric == null ? '—' : riskNumeric <= 30 ? 'Low confidence' : riskNumeric <= 60 ? 'Medium confidence' : 'High confidence';
  const withinStoreSignals = useMemo(() => {
    const linked = Array.isArray(data?.linkedAccounts) ? data.linkedAccounts : [];
    return linked.slice(0, 8).map((row: any, i: number) => ({
      signal: row.entityType ? String(row.entityType).replace(/_/g, ' ') : `Signal ${i + 1}`,
      detail: row.entityValue ?? 'Identity variant observed',
      reason: Array.isArray(row.matchReasons) ? row.matchReasons.join(', ').replace(/_/g, ' ') : 'Matching data point',
      date: row.updated_at ?? row.created_at ?? null,
      grade: row.confidence != null ? `${Math.round(Number(row.confidence) * 100)}%` : 'Context',
    }));
  }, [data?.linkedAccounts]);
  const crossMerchantCount = Number(data?.profile?.total_merchants_seen_at ?? 1);
  const actorLabel = (actor?: string | null) => actor ? `Agent #${actor.slice(-4)}` : null;
  const getSlaVisual = (claim: any) => {
    const base = getClaimSlaState(claim);
    const filed = claim?.submitted_at ?? claim?.created_at;
    const ageMs = filed ? Date.now() - new Date(filed).getTime() : 0;
    const status = String(claim?.status ?? '').toLowerCase();
    const notResolved = status !== 'resolved';
    if (base.state === 'overdue') return { label: 'Breached', tone: 'red' as const, icon: <span aria-hidden="true">🕐</span> };
    if (base.state === 'approaching' || (notResolved && ageMs > 24 * 60 * 60 * 1000)) return { label: 'At risk', tone: 'amber' as const, icon: <span aria-hidden="true">⚠</span> };
    return { label: 'Normal', tone: 'gray' as const, icon: null };
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>

      {/* Toast — fixed top-right */}
      {message && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full px-4">
          <p
            className="text-sm px-4 py-2.5 rounded-lg border shadow-md flex items-center gap-2"
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

      {/* Sticky case header */}
      <header
        className="sticky top-0 z-30 border-b px-4 md:px-6 py-3"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            {selectedClaim ? (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    {CLAIM_TYPE_LABELS[selectedClaim.claim_type as ClaimType] ?? selectedClaim.claim_type ?? 'Claim'}
                  </span>
                  <StatusPill status={selectedClaim.status} />
                  <SlaBadge claim={selectedClaim} />
                  {selectedClaim.amount_at_risk != null && (
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {formatMoney(selectedClaim.amount_at_risk, selectedClaim.currency)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {selectedClaim.shopify_order_id ?? selectedClaim.order_ref ?? '—'}
                  {' · '}{customerName}
                  {' · '}{selectedClaim.first_viewed_at ? `Viewed ${new Date(selectedClaim.first_viewed_at).toLocaleDateString('en-US')}` : 'Unread'}
                  {' · '}{selectedClaim.assigned_to ? 'Owner assigned' : 'Unassigned'}
                  {selectedClaim.snoozed_until ? ` · Follow-up ${new Date(selectedClaim.snoozed_until).toLocaleDateString('en-US')}` : ''}
                </p>
              </div>
            ) : (
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Claim review</span>
            )}
            {history.length > 1 && (
              <select
                aria-label="Switch claim"
                className="px-2 py-1.5 rounded-md text-xs"
                style={inputStyle()}
                value={claimId}
                onChange={(e) => setClaimId(e.target.value)}
              >
                <option value="">Switch claim…</option>
                {history.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.shopify_order_id ?? h.order_ref ?? h.id.slice(0, 8)} · {STATUS_LABELS[h.status] ?? h.status}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/claims" className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
              Back to queue
            </a>
            {nextClaimHref && (
              <a href={nextClaimHref} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>
                Next claim
              </a>
            )}
            <a href={customerProfileHref} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
              Customer profile
            </a>
          </div>
        </div>
      </header>

      {/* Two-column case console — stacks below 1100px */}
      <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,1fr)_400px] gap-6 p-4 md:p-6 items-start">

        {/* LEFT — evidence & context (reading) */}
        <div className="space-y-4 min-w-0 order-1 min-[1100px]:col-start-1 min-[1100px]:row-start-1">

          <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <p className="text-caption font-semibold mb-3" style={{ color: 'var(--ink-secondary)' }}>Case intelligence</p>
            {selectedClaim ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  <CaseIntelTile label="Claim">
                    <p className="font-semibold">{CLAIM_TYPE_LABELS[selectedClaim.claim_type as ClaimType] ?? selectedClaim.claim_type}</p>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{selectedClaim.customer_claim_reason || 'No customer reason recorded'}</p>
                  </CaseIntelTile>
                  <CaseIntelTile label="Order">
                    <p className="font-mono text-xs">{selectedClaim.shopify_order_id ?? selectedClaim.order_ref ?? '—'}</p>
                    <p className="font-semibold mt-1">{selectedClaim.amount_at_risk != null ? formatMoney(selectedClaim.amount_at_risk, selectedClaim.currency) : '—'}</p>
                  </CaseIntelTile>
                  <CaseIntelTile label="Status">
                    <div className="flex flex-wrap gap-1"><StatusPill status={selectedClaim.status} /><SlaBadge claim={selectedClaim} /></div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatClaimAge(selectedClaim)} · {formatFiledDate(selectedClaim)}</p>
                  </CaseIntelTile>
                  <CaseIntelTile label="Evidence">
                    <p className="font-semibold" style={{ color: evidenceRecorded ? '#166534' : 'var(--text)' }}>{evidenceRecorded ? 'On record' : 'Missing'}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{evidenceRecorded ? 'Ready for merchant decision' : 'Add evidence in action rail'}</p>
                  </CaseIntelTile>
                  <CaseIntelTile label="Owner">
                    <p className="font-semibold">{selectedClaim.assigned_to ? 'Assigned' : 'Unassigned'}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{selectedClaim.first_viewed_at ? `Viewed ${new Date(selectedClaim.first_viewed_at).toLocaleDateString('en-US')}` : 'Unread'}</p>
                  </CaseIntelTile>
                  <CaseIntelTile label="Decision">
                    {latestOutcome ? (
                      <>
                        <p className="font-semibold text-xs leading-tight">{DECISION_LABELS[latestOutcome.decision as Decision] ?? latestOutcome.decision}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{OUTCOME_LABELS[latestOutcome.outcome as Outcome] ?? latestOutcome.outcome}</p>
                      </>
                    ) : (
                      <p style={{ color: 'var(--text-muted)' }}>Not recorded</p>
                    )}
                  </CaseIntelTile>
                </div>
                {selectedClaim.normalized_reason && (
                  <p className="text-xs rounded-md px-3 py-2" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>Internal notes: </span>
                    {selectedClaim.normalized_reason}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No claim selected. Expand Edit claim details at the bottom of this column to create one.</p>
            )}
          </section>

          {/* Identity confidence */}
          <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Linked identity confidence</p>
                <p className="mt-1 text-xs max-w-2xl" style={{ color: 'var(--text-muted)' }}>
                  Evidence suggests these records belong to the same identity based on matching data points. Unauth shows context; the merchant owns the action.
                </p>
              </div>
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                Review recommended
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Confidence score</p>
                <p className="font-semibold text-lg font-mono" style={{ color: 'var(--text)' }}>{riskNumeric ?? '—'}</p>
                <div className="mt-1 h-2 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #16A34A 0%, #16A34A 30%, #D97706 30%, #D97706 60%, #7C1D1D 60%, #7C1D1D 100%)' }}>
                  <div className="h-full" style={{ width: `${riskNumeric ?? 0}%`, background: 'rgba(17,24,39,0.45)' }} />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{riskBand}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Linked accounts</p>
                <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>{data?.linkedAccounts?.length ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Refund/fulfilment</p>
                <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>{order?.refundStatus ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Previous claims</p>
                <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>{history.length}</p>
              </div>
            </div>
            {fraudFlags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {fraudFlags.slice(0, 5).map((f) => (
                  <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--sev-medium-fill, #FEF3C7)', color: 'var(--sev-medium, #B45309)' }}>
                    {signalLabel(f).short}
                  </span>
                ))}
              </div>
            )}
            {identityPoints.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Matching data points</p>
                <div className="flex flex-wrap gap-1.5">
                  {identityPoints.map((point) => (
                    <span key={point} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}>
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cross-merchant and store context */}
          <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Cross-merchant and identity-link context</p>
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{crossMerchantCount > 1 ? `Aggregate signal across ${crossMerchantCount} merchants` : 'Store-scoped signal'}</span>
            </div>
            <div className="mb-3 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>
                {crossMerchantCount > 1 ? 'Cross-merchant signal detected' : 'No cross-merchant aggregate signal yet'}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {crossMerchantCount > 1
                  ? 'Unauth has an anonymised aggregate signal that this identity appears in multiple merchant datasets. Merchant-specific details are not exposed here.'
                  : 'No network-level merchant recurrence is available for this identity. Continue with store-owned evidence.'}
              </p>
            </div>
            {withinStoreSignals.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No additional store-scoped identity variants found yet.</p>
            ) : (
              <div className="space-y-2">
                {withinStoreSignals.map((row: any, i: number) => (
                  <div key={`${row.signal}-${i}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 rounded-md border p-2.5 text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                    <span className="font-semibold capitalize">{row.signal}</span>
                    <span>{row.detail}</span>
                    <span>{row.reason}</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{row.date ? new Date(row.date).toLocaleDateString('en-US') : '—'}</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{row.grade}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recorded merchant decision context — shown once decision exists */}
          {selectedClaim && latestOutcome && (
            <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p className="text-caption font-semibold mb-3" style={{ color: 'var(--ink-secondary)' }}>Recorded merchant decision</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Decision</p>
                  <p className="font-semibold" style={{ color: 'var(--text)' }}>
                    {DECISION_LABELS[latestOutcome.decision as Decision] ?? latestOutcome.decision}
                  </p>
                  {latestOutcome?.actor_user_id && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{actorLabel(latestOutcome.actor_user_id)}</p>}
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Outcome</p>
                  <p className="font-semibold" style={{ color: 'var(--text)' }}>
                    {OUTCOME_LABELS[latestOutcome.outcome as Outcome] ?? latestOutcome.outcome}
                  </p>
                  {latestOutcome?.updated_at && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(latestOutcome.updated_at).toLocaleString('en-US')}</p>
                  )}
                </div>
                {previousOutcome && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Previous decision</p>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>
                      {DECISION_LABELS[previousOutcome.decision as Decision] ?? previousOutcome.decision} / {OUTCOME_LABELS[previousOutcome.outcome as Outcome] ?? previousOutcome.outcome}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <SupportCaseContextList cases={supportCases} />

          {/* Timeline / audit trail */}
          <section className="rounded-xl p-4 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <div className="mb-3 inline-flex rounded-md border p-0.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
              <button onClick={() => setAuditTab('timeline')} className="px-2.5 py-1 text-xs rounded" style={{ background: auditTab === 'timeline' ? 'var(--accent)' : 'transparent', color: auditTab === 'timeline' ? 'var(--text-inverse)' : 'var(--text-muted)' }}>Event timeline</button>
              <button onClick={() => setAuditTab('history')} className="px-2.5 py-1 text-xs rounded" style={{ background: auditTab === 'history' ? 'var(--accent)' : 'transparent', color: auditTab === 'history' ? 'var(--text-inverse)' : 'var(--text-muted)' }}>Claim history</button>
            </div>
            {auditTab === 'timeline' && (
              <>
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
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{claimEventSummary(event)}</p>
                          </div>
                          <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                            <p>{event.created_at ? new Date(event.created_at).toLocaleString('en-US') : '—'}</p>
                            {event.actor_user_id && <p>{actorLabel(event.actor_user_id)}</p>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
            {auditTab === 'history' && (
              history.length === 0 ? (
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
                      {history.map((h) => {
                        const sla = getSlaVisual(h);
                        const tone = sla.tone === 'red' ? { bg: '#FEE2E2', text: '#991B1B' } : sla.tone === 'amber' ? { bg: '#FEF3C7', text: '#B45309' } : { bg: '#F3F4F6', text: '#4B5563' };
                        return (
                          <tr key={h.id} className="border-t cursor-pointer hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-subtle)' }} onClick={() => setClaimId(h.id)}>
                            <td className="py-2 pr-3 font-mono text-xs">{h.shopify_order_id ?? h.order_ref ?? '—'}</td>
                            <td className="py-2 pr-3"><StatusPill status={h.status} /></td>
                            <td className="py-2 pr-3">{CLAIM_TYPE_LABELS[h.claim_type as ClaimType] ?? h.claim_type}</td>
                            <td className="py-2 pr-3">{h.latest_outcome ? `${DECISION_LABELS[h.latest_outcome.decision as Decision] ?? h.latest_outcome.decision} / ${OUTCOME_LABELS[h.latest_outcome.outcome as Outcome] ?? h.latest_outcome.outcome}` : '—'}</td>
                            <td className="py-2 pr-3 text-xs" style={{ color: 'var(--text-muted)' }}><span>{formatFiledDate(h)}</span><span className="block">{formatClaimAge(h)}</span></td>
                            <td className="py-2 pr-3">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: tone.bg, color: tone.text }}>
                                {sla.icon}{sla.label}
                              </span>
                            </td>
                            <td className="py-2 pr-3">{h.amount_at_risk != null ? formatMoney(h.amount_at_risk, h.currency) : '—'}</td>
                            <td className="py-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{h.updated_at ? new Date(h.updated_at).toLocaleDateString('en-US') : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </section>

        </div>{/* end context column */}

        {/* RIGHT — sticky action command centre */}
        <aside
          className="space-y-2 min-w-0 w-full order-2 min-[1100px]:col-start-2 min-[1100px]:row-start-1 min-[1100px]:row-span-2 min-[1100px]:sticky min-[1100px]:top-[4.25rem] min-[1100px]:max-h-[calc(100vh-4.5rem)] min-[1100px]:overflow-y-auto min-[1100px]:self-start pb-6"
          aria-label="Case actions"
        >

          {/* Command centre — next action + progress */}
          {selectedClaim && (
            <div
              className="rounded-xl px-4 py-3 border"
              style={{ borderColor: 'var(--copper-bright)', background: 'var(--bg-surface)' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-secondary)' }}>Next step</p>
              <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>{primaryAction.label}</p>
              <p className="text-xs mt-1 mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{primaryAction.reason}</p>
              {primaryAction.key === 'close' && nextClaimHref ? (
                <a
                  href={nextClaimHref}
                  className="block w-full text-center px-3 py-2 rounded-md text-sm font-semibold"
                  style={btnStyle('primary')}
                >
                  {primaryAction.cta}
                </a>
              ) : (
                <button
                  type="button"
                  disabled={busy || primaryAction.key === 'none'}
                  onClick={() => void handlePrimaryCta()}
                  className="w-full px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
                  style={btnStyle(primaryAction.key === 'none' ? 'disabled' : 'primary')}
                >
                  {primaryAction.cta}
                </button>
              )}
              <div className="mt-3 pt-3 border-t flex items-center gap-1 flex-wrap" style={{ borderColor: 'var(--border-subtle)' }}>
                {([
                  ['Opened', true],
                  ['Evidence', evidenceRecorded],
                  ['Decision', !!latestOutcome],
                  ['Response', responseRecorded],
                  ['Closed', claimIsClosed],
                ] as Array<[string, boolean]>).map(([label, done], i) => (
                  <div key={label} className="flex items-center gap-1">
                    {i > 0 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>›</span>}
                    <span className="text-[10px] font-semibold" style={{ color: done ? '#166534' : 'var(--text-muted)' }}>
                      {done ? '✓ ' : ''}{label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>Queue hint: {nextClaimAction}</p>
            </div>
          )}

          {/* Completion banner — shown after decision recorded */}
          {(nextClaimHref || noMoreClaims) && primaryAction.key !== 'close' && (
            <div className="rounded-lg px-3 py-2 border text-xs" style={{ borderColor: '#86efac', background: '#dcfce7', color: '#166534' }}>
              {noMoreClaims ? 'Queue complete.' : 'Outcome recorded — continue in queue.'}
            </div>
          )}

          <RailSection id="ownership" title="Ownership" open={railOpen.ownership} onToggle={(id) => setRailOpen((p) => ({ ...p, [id]: !p[id] }))} highlighted={primaryAction.railSection === 'ownership'}>
            {selectedClaim ? (
              <>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  {selectedClaim.assigned_to ? 'Owner assigned' : 'No owner assigned'}
                  {' · '}
                  {selectedClaim.first_viewed_at
                    ? `First viewed ${new Date(selectedClaim.first_viewed_at).toLocaleDateString('en-US')}`
                    : 'Not yet viewed'}
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => onAssignment('assign_to_me')} className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                    Assign to me
                  </button>
                  <button type="button" disabled={busy} onClick={() => onAssignment('unassign')} className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    Unassign
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Save a claim to assign ownership.</p>
            )}
          </RailSection>

          {/* Workflow status accordion */}
          {selectedClaim && (
            <RailSection id="status" title="Workflow status" open={railOpen.status} onToggle={(id) => setRailOpen((p) => ({ ...p, [id]: !p[id] }))} highlighted={primaryAction.railSection === 'status'}>
              <ClaimLifecycleStatusBar
                claimId={claimId}
                busy={busy}
                claimIsClosed={claimIsClosed}
                statusToSet={statusToSet}
                setStatusToSet={setStatusToSet}
                statusNote={statusNote}
                setStatusNote={setStatusNote}
                onStatusChange={onStatusChange}
                reopenNote={reopenNote}
                setReopenNote={setReopenNote}
                onReopen={onReopen}
                canReopen={!!selectedClaim && isFinalClaimStatus(selectedClaim.status)}
                submitIsPrimary={primaryAction.key === 'status' || primaryAction.key === 'reopen'}
              />
            </RailSection>
          )}

          {/* Follow-up / snooze accordion */}
          {selectedClaim && !claimIsClosed && (
            <RailSection
              id="snooze"
              title="Follow-up / snooze"
              open={railOpen.snooze}
              onToggle={(id) => setRailOpen((p) => ({ ...p, [id]: !p[id] }))}
              highlighted={primaryAction.railSection === 'snooze'}
              badge={selectedClaim.snoozed_until ? (
                <span className="text-[10px] rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'var(--sev-medium-fill, #FEF3C7)', color: 'var(--sev-medium, #B45309)' }}>
                  {new Date(selectedClaim.snoozed_until).toLocaleDateString('en-US')}
                </span>
              ) : undefined}
            >
              <div className="flex flex-wrap items-end gap-2 mb-3">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Days
                  <input className="mt-1 block w-16 rounded-md px-2 py-1 text-sm" style={inputStyle()} value={snoozeDays} onChange={(e) => setSnoozeDays(e.target.value)} inputMode="numeric" />
                </label>
                <label className="flex-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Note
                  <input className="mt-1 block w-full rounded-md px-2 py-1 text-sm" style={inputStyle()} value={snoozeReason} onChange={(e) => setSnoozeReason(e.target.value)} />
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={onSnooze} className="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={btnStyle('secondary')}>
                  Snooze
                </button>
                {selectedClaim.snoozed_until && (
                  <button type="button" disabled={busy} onClick={async () => { setState('busy'); const r = await snoozeClaim(claimId, { snoozed_until: null }); setState('idle'); showMsg(r.message, r.message === 'Follow-up updated' ? 'success' : 'error'); await refreshHistory(); }} className="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                    Clear snooze
                  </button>
                )}
              </div>
            </RailSection>
          )}

          {/* Add evidence accordion */}
          <RailSection
            id="evidence"
            title="Add evidence"
            open={railOpen.evidence}
            onToggle={(id) => setRailOpen((p) => ({ ...p, [id]: !p[id] }))}
            highlighted={primaryAction.railSection === 'evidence'}
            badge={evidenceRecorded ? (
              <span className="text-[10px] rounded-full px-1.5 py-0.5 font-semibold" style={{ background: '#dcfce7', color: '#166534' }}>On record</span>
            ) : undefined}
          >
            {!claimId && (
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Save the claim first — evidence attaches to an active claim record.</p>
            )}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={evidenceType} onChange={e => setEvidenceType(e.target.value as EvidenceType)}>
                    {(Object.entries(EVIDENCE_TYPE_LABELS) as [EvidenceType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Source</FieldLabel>
                  <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={source} onChange={e => setSource(e.target.value as EvidenceSource)}>
                    {(Object.entries(EVIDENCE_SOURCE_LABELS) as [EvidenceSource, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel>Evidence URL (optional)</FieldLabel>
                <input className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="https://…" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} />
              </div>
              <button type="button" onClick={() => setShowMeta((v) => !v)} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
                {showMeta ? '▲ Hide' : '▼ Advanced'} — hash &amp; metadata
              </button>
              {showMeta && (
                <div className="space-y-2">
                  <div>
                    <FieldLabel>Evidence hash (SHA-256)</FieldLabel>
                    <input className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="sha256:…" value={evidenceHash} onChange={e => setEvidenceHash(e.target.value)} />
                  </div>
                  {metaRows.map((r, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <input className="px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="key" value={r.key} onChange={e => setMetaRows(prev => prev.map((x, ix) => ix === i ? { ...x, key: e.target.value } : x))} />
                      <input className="px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="value" value={r.value} onChange={e => setMetaRows(prev => prev.map((x, ix) => ix === i ? { ...x, value: e.target.value } : x))} />
                    </div>
                  ))}
                  <button onClick={() => setMetaRows(prev => [...prev, { key: '', value: '' }])} className="px-2 py-1 rounded-md text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>+ Add row</button>
                </div>
              )}
            </div>
            <button
              onClick={onEvidence}
              disabled={busy || !claimId}
              className="mt-3 w-full px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={btnStyle(primaryAction.key === 'evidence' && claimId ? 'primary' : claimId ? 'secondary' : 'disabled')}
            >
              {busy ? <><span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Saving…</> : 'Save evidence'}
            </button>
          </RailSection>

          {/* Merchant decision accordion */}
          {selectedClaim && !claimIsClosed && (
            <RailSection
              id="decision"
              title="Merchant decision"
              open={railOpen.decision}
              onToggle={(id) => setRailOpen((p) => ({ ...p, [id]: !p[id] }))}
              highlighted={primaryAction.railSection === 'decision'}
              badge={latestOutcome ? (
                <span className="text-[10px] rounded-full px-1.5 py-0.5 font-semibold" style={{ background: '#dcfce7', color: '#166534' }}>Recorded</span>
              ) : undefined}
            >
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Unauth surfaces evidence. Merchant decides.</p>
              <div className="space-y-2">
                <div>
                  <FieldLabel>Decision</FieldLabel>
                  <select className="w-full px-2 py-1.5 rounded-md text-sm" style={inputStyle()} value={decision} onChange={e => setDecision(e.target.value as Decision)}>
                    {(Object.entries(DECISION_LABELS) as [Decision, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Outcome</FieldLabel>
                  <select className="w-full px-2 py-1.5 rounded-md text-sm" style={inputStyle()} value={outcome} onChange={e => setOutcome(e.target.value as Outcome)}>
                    {(Object.entries(OUTCOME_LABELS) as [Outcome, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              {!claimId && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Save the claim details first — outcome recording requires an active claim.</p>
              )}
              <button
                onClick={onOutcome}
                disabled={busy || !claimId}
                className="mt-2 w-full px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                style={btnStyle(primaryAction.key === 'decision' && claimId ? 'primary' : claimId ? 'secondary' : 'disabled')}
              >
                {busy ? <><span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Saving…</> : 'Record merchant decision'}
              </button>
            </RailSection>
          )}

          <RailSection
            id="response"
            title="Customer response"
            open={railOpen.response}
            onToggle={(id) => setRailOpen((p) => ({ ...p, [id]: !p[id] }))}
            highlighted={primaryAction.railSection === 'response'}
            badge={responseRecorded ? (
              <span className="text-[10px] rounded-full px-1.5 py-0.5 font-semibold" style={{ background: '#dcfce7', color: '#166534' }}>Sent</span>
            ) : undefined}
          >
            <textarea className="w-full px-2 py-2 rounded-md text-xs resize-none mb-2" style={inputStyle()} rows={4} value={customerResponse} readOnly />
            <p className="mb-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>Internal notes and risk signals stay out of the customer-facing response.</p>
            <button
              onClick={onCopyCustomerResponse}
              disabled={!claimId}
              className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60"
              style={btnStyle(primaryAction.key === 'response' && claimId ? 'primary' : claimId ? 'secondary' : 'disabled')}
            >
              Copy &amp; record
            </button>
          </RailSection>

          {selectedClaim && latestOutcome && (
            <RailSection id="advanced" title="Advanced" open={railOpen.advanced} onToggle={(id) => setRailOpen((p) => ({ ...p, [id]: !p[id] }))}>
              <p className="text-xs mb-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Reverse recorded decision</p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={reverseDecision} onChange={e => setReverseDecision(e.target.value as Decision)}>
                    {(Object.entries(DECISION_LABELS) as [Decision, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={reverseOutcome} onChange={e => setReverseOutcome(e.target.value as Outcome)}>
                    {(Object.entries(OUTCOME_LABELS) as [Outcome, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <textarea className="w-full px-2 py-1.5 rounded-md text-xs resize-none" style={inputStyle()} rows={2} placeholder="Reason for reversal" value={reverseNote} onChange={e => setReverseNote(e.target.value)} />
                <button onClick={onReverse} disabled={busy || !claimId} className="w-full px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60" style={btnStyle('muted')}>
                  Reverse decision
                </button>
              </div>
            </RailSection>
          )}

        </aside>

        {/* Edit claim details — after action rail on narrow screens */}
        <section
          className="order-3 min-w-0 min-[1100px]:col-start-1 min-[1100px]:row-start-2 rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <button
            type="button"
            onClick={() => setClaimFormOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-secondary)' }}>{claimId ? 'Edit claim details' : 'Create claim'}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{claimFormOpen ? '▲' : '▼'}</span>
          </button>
          {claimFormOpen && (
            <div className="px-4 pb-4 pt-0 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shops.length > 0 && (
                  <div>
                    <FieldLabel>Connected shop</FieldLabel>
                    {shops.length <= 1
                      ? <input className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={shopDomain} readOnly />
                      : (
                        <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={shopDomain} onChange={e => setShopDomain(e.target.value)}>
                          {shops.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                  </div>
                )}
                <div className={shops.length > 0 ? '' : 'sm:col-span-2'}>
                  <FieldLabel>Order</FieldLabel>
                  {!manualMode && orderOptions.length > 0 ? (
                    <>
                      <select aria-label="Order" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}>
                        {orderOptions.length > 1 && <option value="">Select an order…</option>}
                        {orderOptions.map((o) => <option key={o.id} value={o.id}>{formatOrderOption(o)}</option>)}
                      </select>
                      <button type="button" onClick={() => setManualModeExplicit(true)} className="mt-1 text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>Enter reference manually</button>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <input className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="Order reference" value={manualOrderRef} onChange={e => setManualOrderRef(e.target.value)} />
                      <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={manualOrderSource} onChange={e => setManualOrderSource(e.target.value)}>
                        <option value="manual">Manual entry</option>
                        <option value="csv">CSV import</option>
                        <option value="shopify">Shopify</option>
                        <option value="audit">Audit</option>
                      </select>
                      {orderOptions.length > 0 && (
                        <button type="button" onClick={() => setManualModeExplicit(false)} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>← Back to order list</button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel>Claim type</FieldLabel>
                  <select className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} value={claimType} onChange={e => setClaimType(e.target.value as ClaimType)}>
                    {(Object.entries(CLAIM_TYPE_LABELS) as [ClaimType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Order value (optional)</FieldLabel>
                  <input type="number" min="0" step="0.01" className="w-full px-2 py-1.5 rounded-md text-xs" style={inputStyle()} placeholder="0.00" value={orderValue} onChange={e => setOrderValue(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Customer&apos;s reason</FieldLabel>
                  <textarea className="w-full px-2 py-1.5 rounded-md text-xs resize-none" style={inputStyle()} rows={2} value={customerReason} onChange={e => setCustomerReason(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Internal notes</FieldLabel>
                  <textarea className="w-full px-2 py-1.5 rounded-md text-xs resize-none" style={inputStyle()} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
              {activeDuplicateClaim && (
                <p className="text-xs rounded-md px-2 py-1.5" style={{ border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b' }}>
                  Active claim exists. <button type="button" onClick={() => setClaimId(activeDuplicateClaim.id)} className="font-semibold underline">Open it</button>
                </p>
              )}
              {resolvedDuplicateClaim && (
                <p className="text-xs rounded-md px-2 py-1.5" style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}>
                  Resolved claim exists. <button type="button" onClick={() => setClaimId(resolvedDuplicateClaim.id)} className="font-semibold underline" style={{ color: 'var(--accent)' }}>Open it</button>
                </p>
              )}
              <button
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

      </div>{/* end two-column body */}
    </div>
  );
}
