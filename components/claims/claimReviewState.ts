'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  recordCustomerResponseCopied,
  assignClaim,
  fetchClaimDecision,
  reopenClaim,
  reverseClaimDecision,
  snoozeClaim,
  submitClaim,
  submitEvidence,
  submitOutcome,
  updateClaimStatus as submitClaimStatus,
} from '@/lib/claims/workflowClient';
import { buildCustomerResponse } from '@/lib/claims/customerResponses';
import { claimHasEvidence } from '@/lib/claims/events';
import { pickPriorityClaim } from '@/lib/claims/priority';
import { ACTIVE_CLAIM_STATUSES, isFinalClaimStatus } from '@/lib/claims/sla';
import { saveClaimDraft } from '@/components/claims/claimReviewDraft';
import { CLAIM_TYPE_LABELS } from '@/components/claims/claimReviewLabels';
import {
  buildMetadata,
  buildOrderOptions,
  draftPatchFromClaim,
  identityEvidencePoints,
  railOpenForClaim,
  resolvePrimaryAction,
  statusNextAction,
} from '@/components/claims/claimReviewLogic';
import {
  claimReviewReducer,
  createClaimReviewInitialState,
  type ClaimReviewState,
} from '@/components/claims/claimReviewReducer';
import type { ClaimRecord } from '@/components/claims/claimReviewTypes';
import { useAdjustStateWhenPropChanges } from '@/lib/react/adjustStateWhenPropChanges';
import { useFetchJson } from '@/lib/react/useFetchJson';
import type { PublicSupportCaseContext } from '@/lib/support/intake/supportCaseReadModel';

type CustomerPayload = {
  profile?: Record<string, unknown>;
  orderHistory?: Array<Record<string, unknown>>;
  linkedAccounts?: Array<Record<string, unknown>>;
};

type ClaimsPayload = {
  shops?: string[];
  activeShopDomain?: string;
  claims?: ClaimRecord[];
};

type SupportPayload = { support_cases?: PublicSupportCaseContext[] };

function requestKey(scope: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${random}`;
}

function pickDraftFields(state: ClaimReviewState, claimId: string) {
  return {
    selectedOrderId: state.selectedOrderId,
    claimType: state.claimType,
    customerReason: state.customerReason,
    notes: state.notes,
    claimId,
    decision: state.decision,
    outcome: state.outcome,
    decisionAmount: state.decisionAmount,
    evidenceType: state.evidenceType,
    source: state.source,
    evidenceUrl: state.evidenceUrl,
    evidenceHash: state.evidenceHash,
    metaRows: state.metaRows,
    manualOrderRef: state.manualOrderRef,
    manualOrderSource: state.manualOrderSource,
    manualModeExplicit: state.manualModeExplicit,
    orderValue: state.orderValue,
    statusToSet: state.statusToSet,
  };
}

export function useClaimReviewWorkbench(
  profileId: string,
  sourceCustomerId: string | null,
  initialClaimId?: string | null,
) {
  const [state, dispatch] = useReducer(
    claimReviewReducer,
    { profileId, initialClaimId },
    ({ profileId: pid, initialClaimId: cid }) => createClaimReviewInitialState(pid, cid),
  );

  const [claimId, setClaimId] = useAdjustStateWhenPropChanges(
    initialClaimId ?? null,
    (id) => id ?? '',
    createClaimReviewInitialState(profileId, initialClaimId).claimId,
  );

  const patch = useCallback((patchValue: Partial<ClaimReviewState>) => {
    dispatch({ type: 'patch', patch: patchValue });
  }, []);
  const decisionRequestKeyRef = useRef<string | null>(null);
  const reversalRequestKeyRef = useRef<string | null>(null);

  const prevSelectedClaimIdForFormRef = useRef<string | null>(null);
  const encodedSourceCustomerId = sourceCustomerId ? encodeURIComponent(sourceCustomerId) : null;
  const { data, reload: reloadCustomer } = useFetchJson<CustomerPayload>(
    encodedSourceCustomerId ? `/api/customers/${encodedSourceCustomerId}` : null,
  );
  const { data: shopifyPayload } = useFetchJson<{ orders?: Array<Record<string, unknown>> }>(
    encodedSourceCustomerId ? `/api/customers/${encodedSourceCustomerId}/shopify-orders` : null,
  );
  const { data: claimsPayload, reload: reloadClaims } = useFetchJson<ClaimsPayload>(
    `/api/claims?profileId=${encodeURIComponent(profileId)}${initialClaimId ? `&claimId=${encodeURIComponent(initialClaimId)}` : ''}`,
  );

  const shops = claimsPayload?.shops ?? [];
  const shopDomain = state.shopDomain || claimsPayload?.activeShopDomain || '';
  const history = useMemo(() => claimsPayload?.claims ?? [], [claimsPayload?.claims]);

  const orderOptions = useMemo(
    () => buildOrderOptions(data ?? null, shopifyPayload?.orders ?? [], history),
    [data, history, shopifyPayload?.orders],
  );

  const manualMode = state.manualModeExplicit || orderOptions.length === 0;

  const effectiveSelectedOrderId = useMemo(() => {
    if (state.selectedOrderId && orderOptions.some((o) => o.id === state.selectedOrderId)) {
      return state.selectedOrderId;
    }
    if (orderOptions.length === 1) return orderOptions[0].id;
    if (orderOptions.length > 1 && history.length > 0) {
      const fromHistory = history[0]?.shopify_order_id ?? history[0]?.order_ref;
      if (fromHistory && orderOptions.some((o) => o.id === String(fromHistory))) {
        return String(fromHistory);
      }
    }
    return state.selectedOrderId;
  }, [history, orderOptions, state.selectedOrderId]);

  const effectiveClaimId = useMemo(() => {
    if (claimId) return claimId;
    const priority = pickPriorityClaim(history, initialClaimId ?? null);
    return priority?.id ?? '';
  }, [claimId, history, initialClaimId]);

  const selectedOrder = useMemo(
    () => orderOptions.find((o) => o.id === effectiveSelectedOrderId),
    [effectiveSelectedOrderId, orderOptions],
  );
  const order = useMemo(
    () => data?.orderHistory?.find((o) => o.orderId === effectiveSelectedOrderId),
    [data, effectiveSelectedOrderId],
  );
  const selectedClaim = useMemo(
    () => history.find((h) => h.id === effectiveClaimId) ?? null,
    [effectiveClaimId, history],
  );
  const resolvedActiveClaimId = selectedClaim?.id ?? effectiveClaimId;

  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionData, setDecisionData] = useState<Record<string, unknown> | null>(null);
  const [decisionStale, setDecisionStale] = useState(false);
  const decisionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadDecision = useCallback(async (targetClaimId: string | null) => {
    if (!targetClaimId) {
      setDecisionData(null);
      setDecisionError(null);
      setDecisionLoading(false);
      setDecisionStale(false);
      return;
    }
    setDecisionLoading(true);
    setDecisionError(null);
    const result = await fetchClaimDecision(targetClaimId);
    setDecisionLoading(false);
    if (!result.ok) {
      setDecisionError(result.message);
      setDecisionData(null);
      setDecisionStale(false);
      return;
    }
    setDecisionData(result.data as Record<string, unknown>);
    setDecisionStale(false);
  }, []);

  const scheduleReloadDecision = useCallback(
    (targetClaimId: string) => {
      if (decisionDebounceRef.current) clearTimeout(decisionDebounceRef.current);
      setDecisionStale(true);
      decisionDebounceRef.current = setTimeout(() => {
        void reloadDecision(targetClaimId);
      }, 400);
    },
    [reloadDecision],
  );

  const refreshRecommendation = useCallback(() => {
    if (!resolvedActiveClaimId) return;
    if (decisionDebounceRef.current) clearTimeout(decisionDebounceRef.current);
    setDecisionStale(true);
    void reloadDecision(resolvedActiveClaimId);
  }, [resolvedActiveClaimId, reloadDecision]);

  useEffect(() => {
    return () => {
      if (decisionDebounceRef.current) clearTimeout(decisionDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    setDecisionData(null);
    setDecisionError(null);
    setDecisionStale(false);
    void reloadDecision(resolvedActiveClaimId || null);
  }, [reloadDecision, resolvedActiveClaimId]);

  useEffect(() => {
    if (!selectedClaim || !decisionData?.evaluatedAt || decisionLoading) return;
    const claimUpdated = selectedClaim.updated_at ? Date.parse(selectedClaim.updated_at) : 0;
    const evaluatedAt = Date.parse(String(decisionData.evaluatedAt));
    if (Number.isFinite(claimUpdated) && Number.isFinite(evaluatedAt) && claimUpdated > evaluatedAt) {
      setDecisionStale(true);
    }
  }, [decisionData, decisionLoading, selectedClaim]);

  const supportUrl = resolvedActiveClaimId
    ? `/api/claims/${encodeURIComponent(resolvedActiveClaimId)}/support-context`
    : null;
  const { data: supportPayload } = useFetchJson<SupportPayload>(supportUrl);
  const supportCases = resolvedActiveClaimId ? (supportPayload?.support_cases ?? []) : [];

  const selectedClaimOutcomes = selectedClaim?.outcomes ?? [];
  const latestOutcome = selectedClaimOutcomes[0] ?? selectedClaim?.latest_outcome ?? null;
  const previousOutcome = selectedClaimOutcomes[1] ?? null;
  const selectedClaimEvents = selectedClaim?.events ?? [];
  const customerResponse = useMemo(
    () => buildCustomerResponse({ decision: latestOutcome?.decision, outcome: latestOutcome?.outcome, status: selectedClaim?.status }),
    [latestOutcome, selectedClaim?.status],
  );
  const responseRecorded = selectedClaimEvents.some((event) => event.event_type === 'customer_response_copied');
  const evidenceRecorded = claimHasEvidence({ evidence_count: selectedClaim?.evidence_count, events: selectedClaimEvents });
  const claimIsClosed = selectedClaim ? isFinalClaimStatus(selectedClaim.status) : false;

  useEffect(() => {
    dispatch({ type: 'setRailOpen', railOpen: railOpenForClaim(selectedClaim) });
  }, [selectedClaim]);

  useEffect(() => {
    const selectedClaimIdForForm = selectedClaim?.id ?? null;
    if (!selectedClaim || selectedClaimIdForForm === prevSelectedClaimIdForFormRef.current) return;
    prevSelectedClaimIdForFormRef.current = selectedClaimIdForForm;
    patch(draftPatchFromClaim(selectedClaim, orderOptions));
  }, [orderOptions, patch, selectedClaim?.id, selectedClaim]);

  const claimFormOpen = state.claimFormOpen || !effectiveClaimId;

  useEffect(() => {
    saveClaimDraft(profileId, pickDraftFields(state, effectiveClaimId));
  }, [effectiveClaimId, profileId, state]);

  const metadata = useMemo(() => buildMetadata(state.metaRows), [state.metaRows]);
  const effectiveOrderRef = manualMode ? state.manualOrderRef.trim() : effectiveSelectedOrderId;
  const duplicateClaim = useMemo(() => {
    if (!effectiveOrderRef) return null;
    return (
      history.find((h) => {
        if (h.id === effectiveClaimId) return false;
        const orderRef = String(h.shopify_order_id ?? h.order_ref ?? '');
        return orderRef === effectiveOrderRef && h.claim_type === state.claimType;
      }) ?? null
    );
  }, [effectiveClaimId, effectiveOrderRef, history, state.claimType]);

  const activeDuplicateClaim =
    duplicateClaim && ACTIVE_CLAIM_STATUSES.includes(duplicateClaim.status as (typeof ACTIVE_CLAIM_STATUSES)[number])
      ? duplicateClaim
      : null;
  const resolvedDuplicateClaim = duplicateClaim && isFinalClaimStatus(duplicateClaim.status) ? duplicateClaim : null;

  const customerName =
    (data?.profile?.names as string[] | undefined)?.[0] ??
    (data?.profile?.customerName as string | undefined) ??
    (data?.profile?.name as string | undefined) ??
    'Customer';
  const behaviorSignals: string[] = (order?.fraudFlags as string[] | undefined) ?? (data?.profile?.fraud_flags as string[] | undefined) ?? [];
  const nextClaimAction = statusNextAction(selectedClaim, !!latestOutcome, responseRecorded);
  const primaryAction = useMemo(
    () => resolvePrimaryAction(selectedClaim, evidenceRecorded, !!latestOutcome, responseRecorded, claimIsClosed, effectiveClaimId),
    [selectedClaim, evidenceRecorded, latestOutcome, responseRecorded, claimIsClosed, effectiveClaimId],
  );
  const identityPoints = identityEvidencePoints(data ?? null, order, behaviorSignals);
  const busy = state.busy;
  const withinStoreSignals = useMemo(() => {
    const linked = Array.isArray(data?.linkedAccounts) ? data.linkedAccounts : [];
    return linked.slice(0, 8).map((row, i) => ({
      signal: row.entityType ? String(row.entityType).replace(/_/g, ' ') : `Signal ${i + 1}`,
      detail: (row.entityValue as string | undefined) ?? 'Identity variant observed',
      reason: Array.isArray(row.matchReasons) ? row.matchReasons.join(', ').replace(/_/g, ' ') : 'Matching data point',
      date: (row.updated_at as string | undefined) ?? (row.created_at as string | undefined) ?? null,
      grade: row.confidence != null ? `${Math.round(Number(row.confidence) * 100)}%` : 'Context',
      key: `${row.entityType ?? 'signal'}-${i}`,
    }));
  }, [data?.linkedAccounts]);
  const customerProfileHref = sourceCustomerId ? `/customers/${encodeURIComponent(sourceCustomerId)}` : `/customers/${encodeURIComponent(profileId)}`;

  function showMsg(msg: string, tone: 'success' | 'error') {
    patch({ message: msg, messageTone: tone });
  }

  async function refreshHistory() {
    await reloadClaims();
  }

  function openRailSection(section: string) {
    dispatch({ type: 'openRail', section });
  }

  async function handlePrimaryCta() {
    switch (primaryAction.key) {
      case 'save_claim':
        patch({ claimFormOpen: true });
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
        if (state.nextClaimHref) window.location.href = state.nextClaimHref;
        else openRailSection('status');
        break;
      default:
        break;
    }
  }

  async function onClaim() {
    const effectiveRef = manualMode ? state.manualOrderRef.trim() : effectiveSelectedOrderId;
    if (!effectiveRef) {
      showMsg(
        manualMode ? 'Please enter an order reference to continue' : 'Select an order before saving the claim.',
        'error',
      );
      return;
    }
    if (activeDuplicateClaim) {
      setClaimId(activeDuplicateClaim.id);
      showMsg(`An active ${CLAIM_TYPE_LABELS[state.claimType].toLowerCase()} claim already exists for this order.`, 'error');
      return;
    }
    if (resolvedDuplicateClaim) {
      setClaimId(resolvedDuplicateClaim.id);
      showMsg(
        `A resolved ${CLAIM_TYPE_LABELS[state.claimType].toLowerCase()} claim already exists for this order. Reopen the existing claim if new evidence changes the decision.`,
        'error',
      );
      return;
    }
    patch({ nextClaimHref: null, noMoreClaims: false, busy: true });

    let claimOrderSource: string;
    let claimShopifyOrderId: string | null;
    let claimOrderRef: string | null;
    let claimShopDomain: string | null;

    if (manualMode) {
      claimOrderSource = state.manualOrderSource;
      claimShopifyOrderId = null;
      claimOrderRef = effectiveRef;
      claimShopDomain = null;
    } else {
      claimOrderSource = selectedOrder?.source ?? (shopDomain ? 'shopify' : 'audit');
      claimShopifyOrderId = claimOrderSource === 'shopify' ? effectiveSelectedOrderId : null;
      claimOrderRef = claimOrderSource !== 'shopify' ? effectiveSelectedOrderId : null;
      claimShopDomain = shopDomain || null;
    }

    const parsedValue = state.orderValue ? parseFloat(state.orderValue) : null;
    const amountAtRisk = parsedValue !== null && !isNaN(parsedValue) && parsedValue > 0 ? parsedValue : null;
    const orderCurrency = selectedOrder?.currency ?? null;

    const r = await submitClaim({
      id: effectiveClaimId || undefined,
      shop_domain: claimShopDomain,
      shopify_order_id: claimShopifyOrderId,
      order_source: claimOrderSource,
      order_ref: claimOrderRef,
      customer_id: profileId,
      claim_type: state.claimType,
      customer_claim_reason: state.customerReason,
      normalized_reason: state.notes,
      status: 'manual_review',
      amount_at_risk: amountAtRisk,
      currency: amountAtRisk ? (orderCurrency ?? null) : null,
    });
    patch({ busy: false });
    showMsg(r.message, r.claimId ? 'success' : 'error');
    if (r.claimId) {
      setClaimId(r.claimId);
      saveClaimDraft(profileId, pickDraftFields(state, r.claimId));
      scheduleReloadDecision(r.claimId);
    } else if (r.duplicateClaimId) {
      setClaimId(r.duplicateClaimId);
    }
    await refreshHistory();
  }

  async function onOutcome() {
    if (!resolvedActiveClaimId) {
      showMsg('Save a claim first, then record the outcome.', 'error');
      return;
    }
    const monetaryDecision = ['approved', 'partial_refund', 'full_refund', 'denied', 'no_action'].includes(state.decision);
    const amountMajor = Number(state.decisionAmount);
    const currency = selectedClaim?.currency ?? null;
    if (monetaryDecision && (!Number.isFinite(amountMajor) || amountMajor < 0 || !currency)) {
      showMsg('Enter the decision amount and confirm its currency before recording this decision.', 'error');
      return;
    }
    const idempotencyKey = decisionRequestKeyRef.current
      ?? requestKey(`case-decision:${resolvedActiveClaimId}`);
    decisionRequestKeyRef.current = idempotencyKey;
    patch({ busy: true });
    const r = await submitOutcome(resolvedActiveClaimId, {
      decision: state.decision,
      outcome: 'pending',
      amount_minor: monetaryDecision ? Math.round(amountMajor * 100) : null,
      currency: monetaryDecision ? currency : null,
      notes: state.notes,
    }, idempotencyKey);
    patch({ busy: false });
    if (r.message.toLowerCase().includes('saved')) {
      decisionRequestKeyRef.current = null;
      showMsg(
        state.decision === 'escalated'
          ? 'Merchant outcome recorded. Claim flagged for high evidence density review.'
          : 'Merchant outcome recorded.',
        'success',
      );
      saveClaimDraft(profileId, pickDraftFields(state, resolvedActiveClaimId));
      const next = await fetch(
        `/api/claims?queue=active&sort=age&limit=1&excludeId=${encodeURIComponent(resolvedActiveClaimId)}`,
      )
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
      const nextClaim = next?.claims?.[0];
      if (nextClaim?.id) {
        patch({ nextClaimHref: `/claims/${nextClaim.id}`, noMoreClaims: false });
      } else {
        patch({ nextClaimHref: null, noMoreClaims: true });
      }
    } else {
      showMsg(r.message, 'error');
    }
    await refreshHistory();
    scheduleReloadDecision(resolvedActiveClaimId);
  }

  async function onEvidence() {
    if (!resolvedActiveClaimId) {
      showMsg('Save a claim first, then attach evidence.', 'error');
      return;
    }
    patch({ busy: true });
    const r = await submitEvidence(resolvedActiveClaimId, {
      evidence_type: state.evidenceType,
      source: state.source,
      evidence_url: state.evidenceUrl || null,
      evidence_hash: state.evidenceHash || null,
      metadata,
    });
    patch({ busy: false });
    showMsg(r.message, r.message.toLowerCase().includes('saved') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('saved')) {
      saveClaimDraft(profileId, pickDraftFields(state, resolvedActiveClaimId));
    }
    await refreshHistory();
    scheduleReloadDecision(resolvedActiveClaimId);
  }

  async function onStatusChange() {
    if (!resolvedActiveClaimId) {
      showMsg('Save or select a claim before changing status.', 'error');
      return;
    }
    if (!state.statusNote.trim()) {
      showMsg('Add a short note before changing status.', 'error');
      return;
    }
    patch({ busy: true });
    const r = await submitClaimStatus(resolvedActiveClaimId, { status: state.statusToSet, note: state.statusNote });
    patch({ busy: false });
    showMsg(r.message, r.message.toLowerCase().includes('updated') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('updated')) patch({ statusNote: '' });
    await refreshHistory();
    scheduleReloadDecision(resolvedActiveClaimId);
  }

  async function onReopen() {
    if (!resolvedActiveClaimId) {
      showMsg('Select a resolved claim before reopening.', 'error');
      return;
    }
    if (!state.reopenNote.trim()) {
      showMsg('Add a reason before reopening the claim.', 'error');
      return;
    }
    patch({ busy: true });
    const r = await reopenClaim(resolvedActiveClaimId, { note: state.reopenNote });
    patch({ busy: false });
    showMsg(r.message, r.message.toLowerCase().includes('reopened') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('reopened')) patch({ reopenNote: '' });
    await refreshHistory();
    scheduleReloadDecision(resolvedActiveClaimId);
  }

  async function onReverse() {
    if (!resolvedActiveClaimId) {
      showMsg('Select a resolved claim before reversing a decision.', 'error');
      return;
    }
    if (!state.reverseNote.trim()) {
      showMsg('Add a reason before reversing the decision.', 'error');
      return;
    }
    const monetaryDecision = ['approved', 'partial_refund', 'full_refund', 'denied', 'no_action'].includes(state.reverseDecision);
    const amountMajor = Number(state.decisionAmount);
    const currency = selectedClaim?.currency ?? null;
    if (monetaryDecision && (!Number.isFinite(amountMajor) || amountMajor < 0 || !currency)) {
      showMsg('Enter the replacement decision amount and confirm its currency before recording the reversal.', 'error');
      return;
    }
    const idempotencyKey = reversalRequestKeyRef.current
      ?? requestKey(`case-decision-reversal:${resolvedActiveClaimId}`);
    reversalRequestKeyRef.current = idempotencyKey;
    patch({ busy: true });
    const r = await reverseClaimDecision(resolvedActiveClaimId, {
      decision: state.reverseDecision,
      outcome: 'pending',
      note: state.reverseNote,
      amount_minor: monetaryDecision ? Math.round(amountMajor * 100) : null,
      currency: monetaryDecision ? currency : null,
    }, idempotencyKey);
    patch({ busy: false });
    showMsg(r.message, r.message.toLowerCase().includes('reversed') ? 'success' : 'error');
    if (r.message.toLowerCase().includes('reversed')) {
      reversalRequestKeyRef.current = null;
      patch({ reverseNote: '' });
    }
    await refreshHistory();
    scheduleReloadDecision(resolvedActiveClaimId);
  }

  async function onCopyCustomerResponse() {
    if (!resolvedActiveClaimId) return;
    try {
      await navigator.clipboard.writeText(customerResponse);
      await recordCustomerResponseCopied(resolvedActiveClaimId, {
        decision: latestOutcome?.decision ?? null,
        outcome: latestOutcome?.outcome ?? null,
        responseText: customerResponse,
      });
      showMsg('Customer response copied and recorded on the claim timeline.', 'success');
      await refreshHistory();
    } catch {
      await recordCustomerResponseCopied(resolvedActiveClaimId, {
        decision: latestOutcome?.decision ?? null,
        outcome: latestOutcome?.outcome ?? null,
        responseText: customerResponse,
      });
      showMsg('Clipboard copy unavailable. Response was still recorded on the claim timeline.', 'success');
      await refreshHistory();
    }
  }

  async function onAssignment(action: 'assign_to_me' | 'unassign') {
    if (!resolvedActiveClaimId) return;
    patch({ busy: true });
    const r = await assignClaim(resolvedActiveClaimId, action);
    patch({ busy: false });
    showMsg(r.message, r.message === 'Assignment updated' ? 'success' : 'error');
    await refreshHistory();
  }

  async function onSnooze() {
    if (!resolvedActiveClaimId) return;
    const days = Math.max(1, Math.min(30, parseInt(state.snoozeDays, 10) || 2));
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    patch({ busy: true });
    const r = await snoozeClaim(resolvedActiveClaimId, { snoozed_until: until, reason: state.snoozeReason });
    patch({ busy: false });
    showMsg(r.message, r.message === 'Follow-up updated' ? 'success' : 'error');
    await refreshHistory();
  }

  async function onClearSnooze() {
    if (!resolvedActiveClaimId) return;
    patch({ busy: true });
    const r = await snoozeClaim(resolvedActiveClaimId, { snoozed_until: null });
    patch({ busy: false });
    showMsg(r.message, r.message === 'Follow-up updated' ? 'success' : 'error');
    await refreshHistory();
  }

  return {
    profileId,
    state,
    dispatch,
    patch,
    claimId: effectiveClaimId,
    setClaimId,
    effectiveSelectedOrderId,
    claimFormOpen,
    data,
    shops,
    shopDomain,
    history,
    orderOptions,
    manualMode,
    selectedOrder,
    order,
    selectedClaim,
    resolvedActiveClaimId,
    supportCases,
    latestOutcome,
    previousOutcome,
    selectedClaimEvents,
    customerResponse,
    responseRecorded,
    evidenceRecorded,
    claimIsClosed,
    duplicateClaim,
    activeDuplicateClaim,
    resolvedDuplicateClaim,
    customerName,
    behaviorSignals,
    nextClaimAction,
    primaryAction,
    identityPoints,
    busy,
    withinStoreSignals,
    customerProfileHref,
    showMsg,
    handlePrimaryCta,
    onClaim,
    onOutcome,
    onEvidence,
    onStatusChange,
    onReopen,
    onReverse,
    onCopyCustomerResponse,
    onAssignment,
    onSnooze,
    onClearSnooze,
    refreshHistory,
    reloadCustomer,
    decisionLoading,
    decisionError,
    decisionData,
    decisionStale,
    reloadDecision,
    refreshRecommendation,
  };
}
