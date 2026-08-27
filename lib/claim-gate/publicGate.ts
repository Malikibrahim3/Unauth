import type { SupabaseClient } from '@supabase/supabase-js';
import { appendClaimEvent } from '@/lib/claims/events';
import { isCanonicalFinalClaimStatus } from '@/lib/claims/statusMachine';
import { classifyClaim, claimGateTypeToStoredClaimType } from '@/lib/claim-gate/classifyClaim';
import { buildEvidence } from '@/lib/claim-gate/buildEvidence';
import { createOrUpdateClaim } from '@/lib/claim-gate/createOrUpdateClaim';
import { evaluateGateRules } from '@/lib/claim-gate/evaluateRules';
import type { ClaimGateClaimType, ClaimGateDecision, ClaimGateEvidence } from '@/lib/claim-gate/types';
import {
  formatRecommendationNote,
  recommendFromEvidence,
  type GateRecommendation,
} from '@/lib/claim-gate/buildRecommendation';
import { applyHoldTag, UNAUTH_HOLD_TAG } from '@/lib/gorgias/applyHoldTag';
import { getAppUrl } from '@/lib/utils/appUrl';

export type PublicGateClaimType =
  | 'delivered_not_received'
  | 'item_not_received'
  | 'refund_after_shipment'
  | 'missing_item'
  | 'damaged_item'
  | 'wrong_item';

export type PublicGatePlatform = 'gorgias' | 'zendesk' | 'freshdesk' | 'yuma' | 'siena' | 'other';

export type PublicGateInput = {
  merchantId: string;
  claim_type?: PublicGateClaimType | string | null;
  order_id?: string | null;
  order_name?: string | null;
  ticket_id?: string | null;
  platform?: PublicGatePlatform | string | null;
  customer_message?: string | null;
  requested_action?: string | null;
  idempotency_key?: string | null;
  customer_email?: string | null;
  escalation_reason?: string | null;
  ai_analysis_summary?: string | null;
  conversation_text?: string | null;
  source?: string | null;
  apply_gorgias_hold?: boolean;
  force_existing_evaluation?: boolean;
};

export type PublicGateTriggeredRule = {
  rule_id: string | null;
  rule_name: string;
  conditions_fired: string[];
  suggested_action: string;
};

export type PublicGateResponse = {
  decision: 'hold' | 'proceed';
  case_id: string;
  case_url: string;
  money_at_risk: number;
  currency: string;
  triggered_rules: PublicGateTriggeredRule[];
  evidence_summary: {
    delivery_status: string;
    pod_present: boolean;
    carrier_claim_window_open: boolean;
    carrier_claim_deadline?: string;
    prior_dnr_claims: number;
    prior_refunds: number;
    order_value: number;
  };
  recovery_routes: string[];
  recommendation: GateRecommendation;
  gorgias_tag?: typeof UNAUTH_HOLD_TAG;
  note_for_agent: string;
  duplicate?: boolean;
  handoff_accepted?: boolean;
  writeback?: { attempted: boolean; ok: boolean; error?: string };
};

export class PublicGateError extends Error {
  constructor(
    public readonly status: 409 | 422 | 500,
    message: string,
    public readonly response?: PublicGateResponse,
  ) {
    super(message);
    this.name = 'PublicGateError';
  }
}

const OPEN_STATUSES = new Set(['new', 'open', 'pending', 'manual_review', 'evidence_needed', 'ready_for_decision', 'escalated']);

function clean(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function gateClaimType(value: string | null | undefined): ClaimGateClaimType | null {
  switch (value) {
    case 'delivered_not_received':
      return 'DELIVERED_NOT_RECEIVED';
    case 'item_not_received':
      return 'ITEM_NOT_RECEIVED';
    case 'refund_after_shipment':
      return 'REFUND_AFTER_SHIPMENT';
    case 'missing_item':
      return 'MISSING_ITEM';
    case 'damaged_item':
      return 'DAMAGED_ITEM';
    case 'wrong_item':
      return 'WRONG_ITEM';
    default:
      return null;
  }
}

function orderRef(input: PublicGateInput): string | null {
  return clean(input.order_id) ?? clean(input.order_name);
}

function syntheticTicketId(input: PublicGateInput, claimType: ClaimGateClaimType): string {
  return (
    clean(input.ticket_id) ??
    clean(input.idempotency_key) ??
    `gate:${input.platform ?? 'api'}:${orderRef(input) ?? 'unknown-order'}:${claimType.toLowerCase()}`
  );
}

async function findExistingCase(input: {
  client: SupabaseClient;
  merchantId: string;
  platform?: string | null;
  ticketId?: string | null;
  sourceOrderId?: string | null;
  claimType: ClaimGateClaimType;
}) {
  const storedClaimType = claimGateTypeToStoredClaimType(input.claimType);
  if (input.ticketId) {
    const provider =
      input.platform === 'zendesk' || input.platform === 'freshdesk' || input.platform === 'gorgias'
        ? input.platform
        : 'gorgias';
    const { data: ticket, error: ticketError } = await input.client
      .from('source_tickets')
      .select('id')
      .eq('merchant_id', input.merchantId)
      .eq('provider', provider)
      .eq('external_id', input.ticketId)
      .maybeSingle();
    if (ticketError) throw new PublicGateError(500, 'ticket_lookup_failed');
    if (ticket?.id) {
      const { data: claim, error: claimError } = await input.client
        .from('support_payout_cases')
        .select('id,status,amount_at_risk,currency')
        .eq('merchant_id', input.merchantId)
        .eq('source_ticket_id', ticket.id)
        .limit(1)
        .maybeSingle();
      if (claimError) throw new PublicGateError(500, 'case_lookup_failed');
      if (claim && !isCanonicalFinalClaimStatus(claim.status) && OPEN_STATUSES.has(claim.status)) return claim;
    }
  }

  if (!input.sourceOrderId) return null;
  const { data, error } = await input.client
    .from('support_payout_cases')
    .select('id,status,amount_at_risk,currency')
    .eq('merchant_id', input.merchantId)
    .eq('source_order_id', input.sourceOrderId)
    .eq('claim_type', storedClaimType)
    .limit(1)
    .maybeSingle();
  if (error) throw new PublicGateError(500, 'case_lookup_failed');
  return data && !isCanonicalFinalClaimStatus(data.status) && OPEN_STATUSES.has(data.status) ? data : null;
}

function caseUrl(claimId: string): string {
  return `${getAppUrl()}/claims?selected=${encodeURIComponent(claimId)}`;
}

function deliverySummary(evidence: ClaimGateEvidence): PublicGateResponse['evidence_summary'] {
  const summary = evidence.summary;
  const deadline =
    summary.carrier_claim_window === 'OPEN' || summary.carrier_claim_window === 'CLOSING_SOON'
      ? carrierClaimDeadline(summary.delivered_at)
      : undefined;
  return {
    delivery_status: deliveryStatusText(summary.delivery_status, summary.proof_of_delivery),
    pod_present: summary.proof_of_delivery === 'PRESENT',
    carrier_claim_window_open: summary.carrier_claim_window === 'OPEN' || summary.carrier_claim_window === 'CLOSING_SOON',
    ...(deadline ? { carrier_claim_deadline: deadline } : {}),
    prior_dnr_claims: summary.prior_dnr_claims_120d,
    prior_refunds: summary.prior_refunds_120d,
    order_value: summary.order_value,
  };
}

function deliveryStatusText(status: string, pod: string): string {
  if (status === 'DELIVERED' && pod === 'PRESENT') return 'Delivered with proof of delivery';
  if (status === 'DELIVERED') return 'Delivered (scan present, proof of delivery incomplete)';
  if (status === 'IN_TRANSIT') return 'In transit';
  if (status === 'PENDING') return 'Pending fulfillment';
  return 'Unknown';
}

function carrierClaimDeadline(deliveredAt: string | null): string | undefined {
  if (!deliveredAt) return undefined;
  const delivered = Date.parse(deliveredAt);
  if (!Number.isFinite(delivered)) return undefined;
  return new Date(delivered + 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function recoveryRoutes(evidence: ClaimGateEvidence): string[] {
  const routes: string[] = [];
  const deadline = carrierClaimDeadline(evidence.summary.delivered_at);
  if (evidence.summary.carrier_claim_window === 'OPEN' && deadline) {
    routes.push(`Carrier claim available until ${deadline}`);
  } else if (evidence.summary.carrier_claim_window === 'CLOSING_SOON' && deadline) {
    routes.push(`Carrier claim window closing soon (${deadline})`);
  }
  if (evidence.summary.chargeback_risk === 'HIGH' || evidence.summary.chargeback_risk === 'MEDIUM') {
    routes.push('Chargeback evidence preservation recommended');
  }
  return routes;
}

function publicRules(decision: ClaimGateDecision): PublicGateTriggeredRule[] {
  return decision.triggeredRules.map((rule) => ({
    rule_id: rule.rule_id,
    rule_name: rule.rule_name,
    conditions_fired: rule.reason ? rule.reason.split(';').map((part) => part.trim()).filter(Boolean) : [],
    suggested_action: decision.policyNextStep,
  }));
}

async function formatResponse(input: {
  client: SupabaseClient;
  merchantId: string;
  claimId: string;
  decision: ClaimGateDecision;
  evidence: ClaimGateEvidence;
  recommendation: GateRecommendation;
  duplicate?: boolean;
  applyGorgiasHold?: boolean;
  ticketId?: string | null;
}): Promise<PublicGateResponse> {
  const held = input.decision.gateStatus !== 'PROCEED';
  const rules = publicRules(input.decision);
  const routes = recoveryRoutes(input.evidence);
  const url = caseUrl(input.claimId);
  const note = formatRecommendationNote(input.recommendation, url);
  const writeback =
    held && input.applyGorgiasHold && input.ticketId
      ? await applyHoldTag({
          client: input.client,
          merchantId: input.merchantId,
          ticketId: input.ticketId,
          caseUrl: url,
          moneyAtRisk: input.evidence.moneyAtRisk,
          currency: input.evidence.currency,
          triggeredRules: rules,
          recoveryRoutes: routes,
          noteBody: note,
        })
      : undefined;

  return {
    decision: held ? 'hold' : 'proceed',
    case_id: input.claimId,
    case_url: url,
    money_at_risk: input.evidence.moneyAtRisk,
    currency: input.evidence.currency,
    triggered_rules: rules,
    evidence_summary: deliverySummary(input.evidence),
    recovery_routes: routes,
    recommendation: input.recommendation,
    ...(held ? { gorgias_tag: UNAUTH_HOLD_TAG } : {}),
    note_for_agent: note,
    ...(input.duplicate ? { duplicate: true } : {}),
    ...(writeback ? { writeback } : {}),
  };
}

export async function evaluatePublicGate(input: {
  client: SupabaseClient;
  payload: PublicGateInput;
}): Promise<PublicGateResponse> {
  const payload = input.payload;
  const orderIdentifier = orderRef(payload);
  if (!orderIdentifier) throw new PublicGateError(422, 'cannot_identify_order');

  const claimText = [
    clean(payload.customer_message),
    clean(payload.escalation_reason),
    clean(payload.ai_analysis_summary),
    clean(payload.conversation_text),
  ].filter(Boolean).join('\n\n') || 'Post-purchase claim submitted for review.';
  const claimType = gateClaimType(payload.claim_type ?? null) ?? await classifyClaim(claimText, payload.requested_action);
  const ticketId = syntheticTicketId(payload, claimType);

  const evidence = await buildEvidence({
    client: input.client,
    merchantId: payload.merchantId,
    customerEmail: payload.customer_email ?? null,
    externalOrderId: orderIdentifier,
    externalTicketId: clean(payload.ticket_id),
    platform: payload.platform ?? null,
    claimText,
    claimType,
  });
  const sourceOrderId = clean(evidence.order?.id as string | null | undefined);
  if (!sourceOrderId) throw new PublicGateError(422, 'cannot_identify_order');

  const existing = await findExistingCase({
    client: input.client,
    merchantId: payload.merchantId,
    platform: payload.platform,
    ticketId: clean(payload.ticket_id),
    sourceOrderId,
    claimType,
  });
  if (existing?.id && payload.force_existing_evaluation === true) {
    const decision = await evaluateGateRules({
      client: input.client,
      merchantId: payload.merchantId,
      claimId: existing.id,
      evidence,
    });
    const recommendation = recommendFromEvidence({ decision, evidence, claimType });
    await input.client
      .from('support_payout_cases')
      .update({
        status: decision.gateStatus === 'PROCEED' ? 'open' : 'manual_review',
        requires_review: decision.gateStatus !== 'PROCEED',
        detection_detail: {
          source: payload.source ?? payload.platform ?? 'api',
          platform: payload.platform ?? null,
          external_ticket_id: clean(payload.ticket_id),
          idempotency_key: clean(payload.idempotency_key),
          gate_status: decision.gateStatus,
          gate_recommendation: recommendation,
        },
      })
      .eq('id', existing.id)
      .eq('merchant_id', payload.merchantId);
    await appendClaimEvent(input.client, {
      claim_id: existing.id,
      merchant_id: payload.merchantId,
      event_type: 'claim_updated',
      previous_status: existing.status,
      new_status: decision.gateStatus === 'PROCEED' ? 'open' : 'manual_review',
      note: `Gate evaluated: ${decision.gateStatus}`,
      triggered_by: 'gate_api',
      metadata: {
        platform: payload.platform ?? null,
        idempotency_key: clean(payload.idempotency_key),
        triggered_rules: decision.triggeredRules,
        evidence_summary: evidence.summary,
      },
    });
    return formatResponse({
      client: input.client,
      merchantId: payload.merchantId,
      claimId: existing.id,
      decision,
      evidence,
      recommendation,
      applyGorgiasHold: payload.apply_gorgias_hold === true && payload.platform === 'gorgias',
      ticketId,
    });
  }

  if (existing?.id) {
    const duplicateDecision: ClaimGateDecision = {
      gateStatus: existing.status === 'open' || existing.status === 'new' ? 'PROCEED' : 'HOLD_FOR_REVIEW',
      triggeredRules: [],
      policyNextStep: existing.status === 'open' || existing.status === 'new'
        ? 'Proceed under normal merchant policy.'
        : 'Hold for review before refund or reship.',
      allowedActions: [],
      blockedActions: [],
      evaluation: null,
    };
    const response = await formatResponse({
      client: input.client,
      merchantId: payload.merchantId,
      claimId: existing.id,
      decision: duplicateDecision,
      evidence,
      recommendation: recommendFromEvidence({ decision: duplicateDecision, evidence, claimType }),
      duplicate: true,
      applyGorgiasHold: false,
      ticketId,
    });
    throw new PublicGateError(409, 'duplicate_open_case', response);
  }

  const claim = await createOrUpdateClaim({
    client: input.client,
    merchantId: payload.merchantId,
    source: payload.source ?? payload.platform ?? 'api',
    actorType: payload.platform === 'yuma' || payload.platform === 'siena' ? 'ai_agent' : 'unknown',
    externalTicketId: ticketId,
    externalOrderId: orderIdentifier,
    customerEmail: clean(payload.customer_email) ?? clean(evidence.order?.customer_email as string | null | undefined) ?? clean(evidence.order?.email as string | null | undefined) ?? 'unknown@example.invalid',
    claimType,
    claimText,
    requestedAction: payload.requested_action ?? null,
    evidence,
  });

  const decision = await evaluateGateRules({
    client: input.client,
    merchantId: payload.merchantId,
    claimId: claim.id,
    evidence,
  });
  const recommendation = recommendFromEvidence({ decision, evidence, claimType });
  await input.client
    .from('support_payout_cases')
    .update({
      status: decision.gateStatus === 'PROCEED' ? 'open' : 'manual_review',
      requires_review: decision.gateStatus !== 'PROCEED',
      detection_detail: {
        source: payload.source ?? payload.platform ?? 'api',
        platform: payload.platform ?? null,
        external_ticket_id: clean(payload.ticket_id),
        idempotency_key: clean(payload.idempotency_key),
        gate_status: decision.gateStatus,
        gate_recommendation: recommendation,
      },
    })
    .eq('id', claim.id)
    .eq('merchant_id', payload.merchantId);

  await appendClaimEvent(input.client, {
    claim_id: claim.id,
    merchant_id: payload.merchantId,
    event_type: 'claim_updated',
    previous_status: claim.status,
    new_status: decision.gateStatus === 'PROCEED' ? 'open' : 'manual_review',
    note: `Gate evaluated: ${decision.gateStatus}`,
    triggered_by: 'gate_api',
    metadata: {
      platform: payload.platform ?? null,
      idempotency_key: clean(payload.idempotency_key),
      triggered_rules: decision.triggeredRules,
      evidence_summary: evidence.summary,
    },
  });

  return formatResponse({
    client: input.client,
    merchantId: payload.merchantId,
    claimId: claim.id,
    decision,
    evidence,
    recommendation,
    applyGorgiasHold: payload.apply_gorgias_hold === true && payload.platform === 'gorgias',
    ticketId,
  });
}
