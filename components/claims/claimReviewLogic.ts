import { claimHasEvidence } from '@/lib/claims/events';
import { getClaimSlaState, isFinalClaimStatus } from '@/lib/claims/sla';
import type { ClaimReviewState } from '@/components/claims/claimReviewReducer';
import { formatClaimMoney } from '@/components/claims/claimReviewStyles';
import { formatDateAbsolute } from '@/lib/utils/format';
import { normaliseClaimStatusForOperator } from '@/components/claims/claimReviewLabels';
import type {
  ClaimRecord,
  ClaimType,
  Decision,
  MetaRow,
  OrderOption,
  Outcome,
  PrimaryActionKey,
} from '@/components/claims/claimReviewTypes';

function safeKey(v: string) {
  return /^[a-zA-Z0-9_.-]{1,40}$/.test(v);
}

function cleanMetaValue(v: string) {
  return v.replace(/[<>]/g, '').trim();
}

export function normalizeMetaRows(rows: Array<{ id?: string; key: string; value: string }>): MetaRow[] {
  return rows.map((row) => ({
    id: row.id ?? crypto.randomUUID(),
    key: row.key,
    value: row.value,
  }));
}

export function formatOrderOption(o: OrderOption) {
  const date = o.date ? formatDateAbsolute(new Date(o.date)) : '—';
  const val = typeof o.orderValue === 'number' ? formatClaimMoney(o.orderValue, o.currency) : '—';
  const status = o.status !== 'unknown' ? o.status : '—';
  return `${o.orderLabel} · ${val} · ${status} · ${date}`;
}

export function resolvePrimaryAction(
  claim: ClaimRecord | null,
  hasEvidence: boolean,
  hasDecision: boolean,
  responseRecorded: boolean,
  claimIsClosed: boolean,
  claimId: string,
): { key: PrimaryActionKey; label: string; reason: string; cta: string; railSection: string | null } {
  if (!claimId) {
    return {
      key: 'save_claim',
      label: 'Waiting for source case',
      reason: 'Connected order, helpdesk, payment, returns, or correspondence sources create case facts automatically.',
      cta: 'Connect source',
      railSection: null,
    };
  }
  if (!claim) {
    return {
      key: 'none',
      label: 'Select a claim',
      reason: 'Choose a claim from the header switcher or review list.',
      cta: '—',
      railSection: null,
    };
  }
  if (claimIsClosed) {
    return {
      key: 'reopen',
      label: 'Closed from source',
      reason: 'This claim is closed. New source-backed events or matched correspondence can update future context.',
      cta: 'View audit',
      railSection: null,
    };
  }
  if (!hasEvidence) {
    return {
      key: 'evidence',
      label: 'Collect source evidence',
      reason: 'Missing evidence is collected from connected sources or kept unavailable with a reason.',
      cta: 'View missing data',
      railSection: 'evidence',
    };
  }
  if (!hasDecision) {
    return {
      key: 'decision',
      label: 'Await source-backed outcome',
      reason: 'Claim outcomes and dispute statuses sync from connected providers or matched correspondence.',
      cta: 'View sources',
      railSection: 'evidence',
    };
  }
  if (!responseRecorded) {
    return {
      key: 'response',
      label: 'Collect correspondence',
      reason: 'External correspondence is ingested from connected channels and matched automatically.',
      cta: 'View correspondence',
      railSection: 'response',
    };
  }
  if (!isFinalClaimStatus(claim.status)) {
    return {
      key: 'status',
      label: 'Status sync pending',
      reason: 'Status changes are applied only from source-backed events.',
      cta: 'View audit',
      railSection: null,
    };
  }
  return {
    key: 'close',
    label: 'Evidence review complete',
    reason: 'Identity evidence and merchant outcome are on record for this claim.',
    cta: 'Next review',
    railSection: null,
  };
}

export function statusNextAction(claim: ClaimRecord | null, hasDecision: boolean, responseRecorded: boolean) {
  if (!claim) return 'Select a source-backed case';
  if (claim.status === 'new') return 'Triage source evidence';
  if (claim.status === 'evidence_needed' || claim.status === 'awaiting_customer_evidence') return 'Request evidence';
  if (
    claim.status === 'awaiting_carrier_response' ||
    claim.status === 'awaiting_3pl_response' ||
    claim.status === 'awaiting_supplier_response'
  ) return 'Wait for external clarification';
  if (claim.status === 'ready_for_decision') return 'Record payout decision';
  if (claim.status === 'manual_review') return 'Escalate internal review';
  if (claim.status === 'open') return 'Review source evidence';
  if (claim.status === 'pending' || claim.status === 'evidence_requested') return 'Check missing source data';
  if (claim.status === 'escalated') return 'Review high-evidence context';
  if (!hasDecision) return 'Await source-backed outcome';
  if (!responseRecorded) return 'Collect correspondence';
  if (isFinalClaimStatus(claim.status)) return 'Evidence review complete';
  return 'Await status sync';
}

export function identityEvidencePoints(
  data: { profile?: { emails?: unknown[]; addresses?: unknown[]; ips?: unknown[]; card_last4s?: unknown[] } } | null,
  order: { ip?: unknown } | null | undefined,
  behaviorSignals: string[],
) {
  const points: string[] = [];
  const emails = Array.isArray(data?.profile?.emails) ? data.profile.emails.length : 0;
  const addresses = Array.isArray(data?.profile?.addresses) ? data.profile.addresses.length : 0;
  const ips = Array.isArray(data?.profile?.ips) ? data.profile.ips.length : 0;
  const cards = Array.isArray(data?.profile?.card_last4s) ? data.profile.card_last4s.length : 0;
  if (emails > 1) points.push(`${emails} email variants`);
  if (addresses > 1) points.push(`${addresses} address variants`);
  if (ips > 1 || order?.ip) points.push('IP/device overlap');
  if (cards > 0) points.push('Payment card signal');
  if (behaviorSignals.length > 0) points.push(`${Math.min(behaviorSignals.length, 5)} behaviour signals`);
  return points.slice(0, 5);
}

export function defaultRailOpen(): Record<string, boolean> {
  return {
    recommendation: true,
    ownership: false,
    status: false,
    snooze: false,
    evidence: false,
    decision: false,
    response: false,
    advanced: false,
  };
}

export function railOpenForClaim(selectedClaim: ClaimRecord | null): Record<string, boolean> {
  if (!selectedClaim) return defaultRailOpen();
  const isClosed = isFinalClaimStatus(selectedClaim.status);
  const hasDecisionNow = !!selectedClaim.latest_outcome;
  const responseNow = (selectedClaim.events ?? []).some((e) => e.event_type === 'customer_response_copied');
  const evidenceNow = claimHasEvidence({
    evidence_count: selectedClaim.evidence_count,
    events: selectedClaim.events ?? [],
  });
  const awaitingInfo =
    selectedClaim.status === 'pending' ||
    selectedClaim.status === 'evidence_requested' ||
    selectedClaim.status === 'evidence_needed' ||
    selectedClaim.status === 'awaiting_customer_evidence' ||
    selectedClaim.status === 'awaiting_carrier_response' ||
    selectedClaim.status === 'awaiting_3pl_response' ||
    selectedClaim.status === 'awaiting_supplier_response';

  return {
    recommendation: true,
    ownership: false,
    status: awaitingInfo,
    snooze: awaitingInfo,
    evidence: !evidenceNow && !isClosed,
    decision: evidenceNow && !hasDecisionNow && !isClosed,
    response: hasDecisionNow && !responseNow && !isClosed,
    advanced: isClosed,
  };
}

export function actorLabel(actor?: string | null) {
  return actor ? `Reviewer #${actor.slice(-4)}` : null;
}

export function getSlaVisual(claim: ClaimRecord | null) {
  if (!claim) return { label: 'Normal', tone: 'gray' as const, icon: null };
  const base = getClaimSlaState(claim);
  const filed = claim?.submitted_at ?? claim?.created_at;
  const ageMs = filed ? Date.now() - new Date(filed).getTime() : 0;
  const status = String(claim?.status ?? '').toLowerCase();
  const notResolved = status !== 'resolved';
  if (base.state === 'overdue') return { label: 'Ageing', tone: 'red' as const, icon: 'clock' as const };
  if (base.state === 'approaching' || (notResolved && ageMs > 24 * 60 * 60 * 1000)) {
    return { label: 'Approaching threshold', tone: 'amber' as const, icon: 'warning' as const };
  }
  return { label: 'Within threshold', tone: 'gray' as const, icon: null };
}

export function buildOrderOptions(
  data: { orderHistory?: Array<Record<string, unknown>> } | null,
  shopifyOrders: Array<Record<string, unknown>>,
  history: ClaimRecord[],
): OrderOption[] {
  const map = new Map<string, OrderOption>();
  for (const o of data?.orderHistory ?? []) {
    const id = String(o.orderId ?? '');
    if (!id) continue;
    map.set(id, {
      id,
      orderLabel: String(o.orderNumber ?? o.orderId ?? id),
      orderValue: typeof o.orderValue === 'number' ? o.orderValue : null,
      currency: (o.currency as string | null) ?? null,
      status: String(o.refundStatus ?? 'unknown'),
      date: (o.orderDate as string | null) ?? null,
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
      currency: (o.currency as string | null) ?? null,
      status: String(o.status ?? 'unknown'),
      date: (o.processed_at as string | null) ?? null,
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
      source: 'manual',
    });
  }
  return Array.from(map.values());
}

export function buildMetadata(metaRows: MetaRow[]) {
  const out: Record<string, string> = {};
  for (const r of metaRows) {
    const k = cleanMetaValue(r.key);
    if (!k || !safeKey(k)) continue;
    out[k] = cleanMetaValue(r.value).slice(0, 200);
  }
  return out;
}

export function draftPatchFromClaim(claim: ClaimRecord, orderOptions: OrderOption[]): Partial<ClaimReviewState> {
  const patch: Partial<ClaimReviewState> = {};
  if (claim.claim_type) patch.claimType = claim.claim_type as ClaimType;
  if (claim.customer_claim_reason) patch.customerReason = claim.customer_claim_reason;
  if (claim.normalized_reason) patch.notes = claim.normalized_reason;
  const orderRef = String(claim.shopify_order_id ?? claim.order_ref ?? '');
  if (orderRef && orderOptions.some((o) => o.id === orderRef)) {
    patch.selectedOrderId = orderRef;
    patch.manualModeExplicit = false;
  } else if (orderRef) {
    patch.manualOrderRef = orderRef;
    patch.manualModeExplicit = true;
  }
  if (claim.amount_at_risk != null) patch.orderValue = String(claim.amount_at_risk);
  if (claim.latest_outcome?.decision) patch.decision = claim.latest_outcome.decision as Decision;
  if (claim.latest_outcome?.outcome) patch.outcome = claim.latest_outcome.outcome as Outcome;
  if (claim.status) patch.statusToSet = normaliseClaimStatusForOperator(claim.status);
  return patch;
}
