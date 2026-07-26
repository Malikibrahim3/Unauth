/**
 * Unified claim decision context — assembles order, ticket, delivery, evidence,
 * and merchant-local outcome history for a single claim review.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import {
  mergeDeliveryWithTrackingEvidence,
  parseCarrierEvidenceRows,
  type TrackingEvidenceRow,
} from '@/lib/integrations/trackingEvidenceSlice';
import { getStoredIntegrationViews } from '@/lib/integrations/auth';
import { providerShapeFromCanonical, CLAIM_EVIDENCE_ORIGIN_FILTER } from '@/lib/integrations/canonicalEvidence';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const CUSTOMER_EVIDENCE_TYPES = new Set(['customer_message', 'support_ticket']);
const DELIVERY_EVIDENCE_TYPES = new Set(['tracking', 'proof_of_delivery', 'return_label', 'warehouse_scan']);

function directCarrier(company: string | null | undefined, trackingNumber: string | null): 'ups' | 'fedex' | null {
  const value = company?.trim().toLowerCase() ?? '';
  if (value.includes('ups') || /^1Z[A-Z0-9]{16}$/i.test(trackingNumber ?? '')) return 'ups';
  if (value.includes('fedex') || value.includes('federal express')) return 'fedex';
  if (/^\d{12,22}$/.test(trackingNumber ?? '')) return 'fedex';
  return null;
}

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

function gateRecommendationFrom(detectionDetail: unknown): ClaimDecisionContext['claim']['gateRecommendation'] {
  if (!detectionDetail || typeof detectionDetail !== 'object') return null;
  const candidate = (detectionDetail as Record<string, unknown>).gate_recommendation;
  if (!candidate || typeof candidate !== 'object') return null;
  // Persisted verbatim by the decision engine; trust its shape.
  return candidate as ClaimDecisionContext['claim']['gateRecommendation'];
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
    evidenceRes,
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
      .from('evidence_items')
      .select('evidence_type, summary, structured_value, source_created_at, source_record_id, source_system, source_metadata')
      .eq('merchant_id', merchantId)
      .in('source_system', ['ups', 'fedex'])
      .eq('claim_id', claimId),
    getStoredIntegrationViews(client, merchantId).then((views) => ({ data: views, error: null })),
    client
      .from('evidence_items')
      .select('evidence_type,structured_value,summary,source_created_at,created_at')
      .eq('claim_id', claimId)
      .eq('merchant_id', merchantId)
      .or(CLAIM_EVIDENCE_ORIGIN_FILTER),
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
  const trackingNumber = fulfillmentRes.data?.tracking_number?.trim() ?? null;
  const carrierProvider = directCarrier(fulfillmentRes.data?.tracking_company, trackingNumber);
  const carrierConnected = carrierProvider != null && integrationViews.some(
    (view) => view.id === carrierProvider && view.status === 'connected',
  );
  let carrierRows = ((integrationEvidenceRes.data ?? []) as any[])
    .map(providerShapeFromCanonical) as TrackingEvidenceRow[];
  carrierRows = carrierRows.filter((row) => row.source_provider === carrierProvider);
  if (carrierRows.length === 0 && trackingNumber && carrierProvider) {
    const { data: byTracking } = await client
      .from('evidence_items')
      .select('evidence_type, summary, structured_value, source_created_at, source_record_id, source_system, source_metadata')
      .eq('merchant_id', merchantId)
      .eq('source_system', carrierProvider)
      .eq('source_record_id', trackingNumber);
    carrierRows = ((byTracking ?? []) as any[]).map(providerShapeFromCanonical) as TrackingEvidenceRow[];
  }
  const trackingSlice = parseCarrierEvidenceRows(carrierRows, {
    provider: carrierProvider,
    providerConnected: carrierConnected,
    trackingNumber,
  });
  delivery = mergeDeliveryWithTrackingEvidence(fulfillmentRes.data, trackingSlice);

  const evidenceItems = evidenceRes.error ? [] : (evidenceRes.data ?? []);
  const photoFinding = evidenceItems
    .filter((item) => item.evidence_type === 'delivery_photo_finding')
    .toSorted((left, right) => {
      const leftAt = Date.parse(left.source_created_at ?? left.created_at ?? '');
      const rightAt = Date.parse(right.source_created_at ?? right.created_at ?? '');
      return (Number.isFinite(rightAt) ? rightAt : 0) - (Number.isFinite(leftAt) ? leftAt : 0);
    })[0];
  const photoFindingValue = photoFinding?.structured_value
    && typeof photoFinding.structured_value === 'object'
    && !Array.isArray(photoFinding.structured_value)
    ? photoFinding.structured_value as Record<string, unknown>
    : null;
  const normalizedPhotoFinding = ['consistent', 'inconsistent', 'unclear'].includes(
    String(photoFindingValue?.finding),
  )
    ? photoFindingValue?.finding as 'consistent' | 'inconsistent' | 'unclear'
    : null;
  if (delivery && normalizedPhotoFinding) {
    delivery = {
      ...delivery,
      deliveryPhotoFinding: normalizedPhotoFinding,
      deliveryPhotoFindingRationale:
        typeof photoFindingValue?.rationale === 'string'
          ? photoFindingValue.rationale
          : photoFinding?.summary ?? null,
      deliveryPhotoFindingAt: photoFinding?.source_created_at ?? photoFinding?.created_at ?? null,
    };
  }
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

  const identity = identityId
    ? {
        id: identityId,
        confidenceGrade: null,
        confidenceScore: null,
        evidenceScore: null,
        evidenceLevel: null,
        hasSufficientData: false,
        evidenceBreakdown: null,
        isNetworkFlagged: false,
      }
    : null;
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
      networkClaimCount: null,
      networkSameTypeClaimCount: null,
      daysSinceLastClaim: daysSince(lastClaimAt),
      claimTypes,
      hasCrossMerchantIdentity: false,
      networkMerchantCount: 0,
      accountAgeDays: null,
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
      gateRecommendation: gateRecommendationFrom(claimRow.detection_detail),
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
