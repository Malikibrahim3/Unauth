/**
 * Unified claim decision context — assembles order, ticket, delivery, identity,
 * evidence, and outcome history for a single claim review.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import { buildDeliveryFromFulfillment } from '@/lib/claims/decision/deliveryEvidence';
import {
  mergeDeliveryWithTrackingEvidence,
  parseAfterShipEvidenceRows,
  type TrackingEvidenceRow,
} from '@/lib/integrations/trackingEvidenceSlice';
import { getStoredIntegrationViews } from '@/lib/integrations/auth';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const CUSTOMER_EVIDENCE_TYPES = new Set(['customer_message', 'support_ticket']);
const DELIVERY_EVIDENCE_TYPES = new Set(['tracking', 'proof_of_delivery', 'return_label', 'warehouse_scan']);

function daysSince(iso: string | null, nowMs: number = Date.now()): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((nowMs - then) / MS_PER_DAY));
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function claimTypeCountsFromJson(counts: unknown): Record<string, number> {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

function ticketClaimTypeConfidence(detectionDetail: unknown): number | null {
  if (!detectionDetail || typeof detectionDetail !== 'object') return null;
  const d = detectionDetail as Record<string, unknown>;
  const c = d.claim_type_confidence ?? d.classification_confidence;
  const n = Number(c);
  return Number.isFinite(n) ? n : null;
}

const EMPTY_HISTORY: ClaimDecisionContext['history'] = {
  merchantClaimCount: 0,
  merchantPriorClaimCount: 0,
  merchantSameTypeClaimCount: 0,
  merchantPriorSameTypeClaimCount: 0,
  networkClaimCount: null,
  networkSameTypeClaimCount: null,
  priorApprovedClaims: 0,
  priorDeniedClaims: 0,
  priorEscalatedClaims: 0,
  priorChargebacksAfterClaims: 0,
  priorLossOutcomes: 0,
  priorRecoveredOutcomes: 0,
  daysSinceLastClaim: null,
  claimTypes: [],
  hasCrossMerchantIdentity: false,
  networkMerchantCount: 0,
  accountAgeDays: null,
};

const EMPTY_EVIDENCE: ClaimDecisionContext['evidence'] = {
  totalEvidenceItems: 0,
  customerEvidenceItems: 0,
  deliveryEvidenceItems: 0,
  merchantEvidenceItems: 0,
  hasCustomerEvidence: false,
  hasDeliveryEvidence: false,
};

export async function buildClaimDecisionContext(
  client: SupabaseClient,
  merchantId: string,
  claimId: string,
): Promise<ClaimDecisionContext | null> {
  const { data: claimRow, error: claimError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select(
      'id, merchant_id, claim_type, status, amount_at_risk, currency, reason_raw, reason_normalized, source_order_id, source_ticket_id, identity_id, created_at, submitted_at, detection_detail',
    )
    .eq('id', claimId)
    .eq('merchant_id', merchantId)
    .maybeSingle();
  if (claimError) throw new Error(`buildClaimDecisionContext: claim lookup failed: ${claimError.message}`);
  if (!claimRow) return null;

  const claimType = claimRow.claim_type as string | null;
  const identityId = claimRow.identity_id as string | null;
  const sourceOrderId = claimRow.source_order_id as string | null;
  const sourceTicketId = claimRow.source_ticket_id as string | null;

  const [
    ticketRes,
    orderRes,
    fulfillmentRes,
    integrationEvidenceRes,
    integrationViewsRes,
    identityRes,
    evidenceRes,
    profileRes,
    evidenceScoreRes,
    watchlistRes,
    merchantClaimsRes,
  ] = await Promise.all([
    sourceTicketId
      ? client
          .from('source_tickets')
          .select('id, external_id, provider, status, subject')
          .eq('id', sourceTicketId)
          .eq('merchant_id', merchantId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sourceOrderId
      ? client
          .from('source_orders')
          .select(
            'id, external_id, order_number, total_price, order_value, currency, placed_at, financial_status, fulfillment_state',
          )
          .eq('id', sourceOrderId)
          .eq('merchant_id', merchantId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sourceOrderId
      ? client
          .from('source_fulfillments')
          .select('status, shipment_status, tracking_company, tracking_number, occurred_at')
          .eq('source_order_id', sourceOrderId)
          .eq('merchant_id', merchantId)
          .order('occurred_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from('integration_evidence_items')
      .select('evidence_type, summary, value, occurred_at, raw_reference, source_provider')
      .eq('merchant_id', merchantId)
      .eq('source_provider', 'aftership')
      .eq('support_payout_case_id', claimId),
    getStoredIntegrationViews(client, merchantId).then((views) => ({ data: views, error: null })),
    identityId
      ? client
          .from('identities')
          .select('id, confidence_grade, confidence_score, first_seen_at, merchant_count')
          .eq('id', identityId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from('claim_evidence')
      .select('evidence_type')
      .eq('claim_id', claimId)
      .eq('merchant_id', merchantId),
    identityId
      ? client
          .from(TABLES.IDENTITY_PROFILES)
          .select('total_claims, claim_type_counts, merchant_count, first_seen_at, last_seen_at')
          .eq('identity_id', identityId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    identityId
      ? client
          .from(TABLES.IDENTITY_EVIDENCE_SCORES)
          .select('evidence_score, evidence_level, has_sufficient_data, score_breakdown')
          .eq('identity_id', identityId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    identityId
      ? client
          .from(TABLES.WATCHLIST_ENTRIES)
          .select('identity_id')
          .eq('identity_id', identityId)
          .eq('on_watchlist', true)
          .limit(1)
      : Promise.resolve({ data: null, error: null }),
    identityId
      ? client
          .from(TABLES.MERCHANT_CLAIMS)
          .select('id, claim_type, submitted_at')
          .eq('merchant_id', merchantId)
          .eq('identity_id', identityId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  let delivery: ClaimDecisionContext['delivery'] = null;
  const integrationViews = integrationViewsRes.data ?? [];
  const afterShipConnected = integrationViews.some(
    (view) => view.id === 'aftership' && view.status === 'connected',
  );
  const shopifyTrackingNumber = fulfillmentRes.data?.tracking_number?.trim() ?? null;
  let afterShipRows = (integrationEvidenceRes.data ?? []) as TrackingEvidenceRow[];
  if (afterShipRows.length === 0 && shopifyTrackingNumber) {
    const { data: byTracking } = await client
      .from('integration_evidence_items')
      .select('evidence_type, summary, value, occurred_at, raw_reference, source_provider')
      .eq('merchant_id', merchantId)
      .eq('source_provider', 'aftership')
      .eq('raw_reference', shopifyTrackingNumber);
    afterShipRows = (byTracking ?? []) as TrackingEvidenceRow[];
  }
  const trackingSlice = parseAfterShipEvidenceRows(afterShipRows, {
    afterShipConnected,
    shopifyTrackingNumber,
  });
  delivery = mergeDeliveryWithTrackingEvidence(fulfillmentRes.data, trackingSlice);

  const evidenceItems = evidenceRes.error ? [] : (evidenceRes.data ?? []);
  let customerEvidenceItems = 0;
  let deliveryEvidenceItems = 0;
  let merchantEvidenceItems = 0;
  for (const item of evidenceItems) {
    const t = item.evidence_type as string;
    if (CUSTOMER_EVIDENCE_TYPES.has(t)) customerEvidenceItems += 1;
    else if (DELIVERY_EVIDENCE_TYPES.has(t)) deliveryEvidenceItems += 1;
    else merchantEvidenceItems += 1;
  }
  if (delivery && !delivery.hasTracking && deliveryEvidenceItems > 0) {
    delivery = { ...delivery, hasTracking: true };
  }

  const evidence: ClaimDecisionContext['evidence'] = {
    totalEvidenceItems: evidenceItems.length,
    customerEvidenceItems,
    deliveryEvidenceItems,
    merchantEvidenceItems,
    hasCustomerEvidence: customerEvidenceItems > 0,
    hasDeliveryEvidence: deliveryEvidenceItems > 0 || Boolean(delivery?.hasTracking),
  };

  const orderRow = orderRes.data;
  const order = orderRow
    ? {
        id: orderRow.id as string,
        externalId: (orderRow.external_id as string) ?? null,
        orderNumber: (orderRow.order_number as string) ?? null,
        totalAmount: num(orderRow.total_price) ?? num(orderRow.order_value),
        currency: (orderRow.currency as string) ?? null,
        createdAt: (orderRow.placed_at as string) ?? null,
        financialStatus: (orderRow.financial_status as string) ?? null,
        fulfillmentStatus: (orderRow.fulfillment_state as string) ?? null,
      }
    : null;

  const ticketRow = ticketRes.data;
  const ticket = ticketRow
    ? {
        id: ticketRow.id as string,
        externalId: (ticketRow.external_id as string) ?? null,
        source: (ticketRow.provider as string) ?? null,
        status: (ticketRow.status as string) ?? null,
        subject: (ticketRow.subject as string) ?? null,
        claimTypeConfidence: ticketClaimTypeConfidence(claimRow.detection_detail),
      }
    : null;

  const identityRow = identityRes.data;
  const evidenceScoreRow = evidenceScoreRes.data;
  const identity = identityRow
    ? {
        id: identityRow.id as string,
        confidenceGrade: (identityRow.confidence_grade as string) ?? null,
        confidenceScore: num(identityRow.confidence_score),
        evidenceScore: evidenceScoreRow ? num(evidenceScoreRow.evidence_score) : null,
        evidenceLevel: evidenceScoreRow ? (evidenceScoreRow.evidence_level as string) : null,
        hasSufficientData: evidenceScoreRow ? Boolean(evidenceScoreRow.has_sufficient_data) : false,
        evidenceBreakdown: evidenceScoreRow?.score_breakdown ?? null,
        isNetworkFlagged:
          !watchlistRes.error && Array.isArray(watchlistRes.data) && watchlistRes.data.length > 0,
      }
    : null;

  const profile = profileRes.data;
  const networkTypeCounts = claimTypeCountsFromJson(profile?.claim_type_counts);
  const merchantClaims = merchantClaimsRes.error ? [] : (merchantClaimsRes.data ?? []);
  const otherMerchantClaims = merchantClaims.filter((c) => c.id !== claimId);
  const sameTypeAll = merchantClaims.filter((c) => c.claim_type === claimType);
  const sameTypePrior = otherMerchantClaims.filter((c) => c.claim_type === claimType);
  const claimTypes = [
    ...new Set(merchantClaims.map((c) => c.claim_type as string).filter(Boolean)),
  ];

  const lastClaimAt = otherMerchantClaims
    .map((c) => c.submitted_at as string)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  let history: ClaimDecisionContext['history'] = { ...EMPTY_HISTORY };
  if (identityId) {
    history = {
      ...history,
      merchantClaimCount: merchantClaims.length,
      merchantPriorClaimCount: otherMerchantClaims.length,
      merchantSameTypeClaimCount: sameTypeAll.length,
      merchantPriorSameTypeClaimCount: sameTypePrior.length,
      networkClaimCount: profile ? num(profile.total_claims) : null,
      networkSameTypeClaimCount: claimType ? (networkTypeCounts[claimType] ?? null) : null,
      daysSinceLastClaim: daysSince(lastClaimAt),
      claimTypes,
      hasCrossMerchantIdentity: (identityRow?.merchant_count ?? 0) > 1,
      networkMerchantCount: profile ? Number(profile.merchant_count ?? 0) : 0,
      accountAgeDays: daysSince(profile?.first_seen_at as string | null),
    };

    const otherClaimIds = otherMerchantClaims.map((c) => c.id as string);
    if (otherClaimIds.length > 0) {
      const { data: outcomes } = await client
        .from('claim_outcomes')
        .select('decision, outcome, claim_id')
        .in('claim_id', otherClaimIds);

      for (const o of outcomes ?? []) {
        const decision = o.decision as string;
        const outcome = o.outcome as string;
        if (decision === 'approved' || decision === 'full_refund' || decision === 'partial_refund') {
          history.priorApprovedClaims += 1;
        }
        if (decision === 'denied') history.priorDeniedClaims += 1;
        if (decision === 'escalated') history.priorEscalatedClaims += 1;
        if (outcome === 'loss') history.priorLossOutcomes += 1;
        if (outcome === 'recovered' || outcome === 'chargeback_won') history.priorRecoveredOutcomes += 1;
      }

      history.priorChargebacksAfterClaims = otherMerchantClaims.filter(
        (c) => c.claim_type === 'chargeback',
      ).length;
    }
  }

  return {
    merchantId,
    claim: {
      id: claimRow.id as string,
      type: claimType,
      status: (claimRow.status as string) ?? null,
      amountAtRisk: num(claimRow.amount_at_risk),
      currency: (claimRow.currency as string) ?? null,
      reasonRaw: (claimRow.reason_raw as string) ?? null,
      reasonNormalized: (claimRow.reason_normalized as string) ?? null,
      sourceOrderId,
      sourceTicketId,
      identityId,
      createdAt: (claimRow.created_at as string) ?? (claimRow.submitted_at as string) ?? null,
    },
    ticket,
    order,
    delivery,
    identity,
    history,
    evidence,
  };
}

export { resolveClaimForTicketDecision, resolveClaimIdForTicket } from '@/lib/claims/decision/resolveClaim';
