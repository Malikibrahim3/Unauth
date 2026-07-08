/**
 * Maps ClaimDecisionContext to the signal shape consumed by evaluateRules().
 *
 * Count semantics (documented for merchant rules):
 * - merchant_claim_count: all claims at this store for this identity, including current
 * - merchant_prior_claim_count: prior claims at this store excluding current
 * - merchant_same_type_claim_count: same-type claims including current
 * - merchant_prior_same_type_claim_count: same-type prior claims excluding current
 */
import type { IdentitySignals } from '@/lib/rules-engine';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import type {
  AttributionConfidence,
  EvidenceStrength,
  LikelyOwner,
  LossAttributionLabel,
  Recoverability,
  RequestedAction,
  SupportPayoutCase,
} from '@/lib/payouts/types';

export type ClaimDecisionSignals = IdentitySignals & {
  claim_type?: string | null;
  amount_at_risk?: number | null;
  delivery_status?: string | null;
  days_since_delivery?: number | null;
  has_tracking?: boolean;
  has_proof_of_delivery?: boolean;
  has_customer_evidence?: boolean;
  evidence_items_count?: number;
  merchant_prior_claim_count?: number;
  merchant_same_type_claim_count?: number;
  merchant_prior_same_type_claim_count?: number;
  prior_approved_claims?: number;
  prior_denied_claims?: number;
  prior_escalated_claims?: number;
  prior_chargebacks_after_claims?: number;
  prior_loss_outcomes?: number;
  prior_recovered_outcomes?: number;
  ticket_claim_type_confidence?: number | null;
  is_network_flagged?: boolean;
  // Payout & recovery (populated when a SupportPayoutCase is supplied; otherwise
  // left undefined so rules referencing them simply do not match).
  total_estimated_loss?: number | null;
  above_review_threshold?: boolean;
  requested_action?: RequestedAction;
  loss_attribution?: LossAttributionLabel;
  loss_attribution_confidence?: AttributionConfidence;
  recoverability?: Recoverability;
  likely_owner?: LikelyOwner;
  evidence_strength?: EvidenceStrength;
};

export function claimDecisionContextToSignals(
  context: ClaimDecisionContext,
  payoutCase?: SupportPayoutCase,
): ClaimDecisionSignals {
  const { claim, order, delivery, history, evidence, identity } = context;

  const orderValue =
    claim.amountAtRisk ??
    order?.totalAmount ??
    null;

  const payoutSignals: Partial<ClaimDecisionSignals> = payoutCase
    ? {
        total_estimated_loss: payoutCase.exposure.total.amount,
        above_review_threshold: payoutCase.exposure.aboveReviewThreshold,
        requested_action: payoutCase.requestedAction.primary,
        loss_attribution: payoutCase.attribution.label,
        loss_attribution_confidence: payoutCase.attribution.confidence,
        recoverability: payoutCase.recovery.recoverability,
        likely_owner: payoutCase.recovery.likelyOwner,
        evidence_strength: payoutCase.evidence.strength,
      }
    : {};

  return {
    ...payoutSignals,
    merchant_claim_count: history.merchantClaimCount,
    days_since_last_claim: history.daysSinceLastClaim,
    claim_types: history.claimTypes,
    order_value_usd: orderValue,
    account_age_days: history.accountAgeDays,

    claim_type: claim.type,
    amount_at_risk: claim.amountAtRisk,
    delivery_status: delivery?.status ?? null,
    days_since_delivery: delivery?.daysSinceDelivery ?? null,
    has_tracking: delivery?.hasTracking ?? false,
    has_proof_of_delivery: delivery?.hasProofOfDelivery ?? false,
    has_customer_evidence: evidence.hasCustomerEvidence,
    evidence_items_count: evidence.totalEvidenceItems,
    merchant_prior_claim_count: history.merchantPriorClaimCount,
    merchant_same_type_claim_count: history.merchantSameTypeClaimCount,
    merchant_prior_same_type_claim_count: history.merchantPriorSameTypeClaimCount,
    prior_approved_claims: history.priorApprovedClaims,
    prior_denied_claims: history.priorDeniedClaims,
    prior_escalated_claims: history.priorEscalatedClaims,
    prior_chargebacks_after_claims: history.priorChargebacksAfterClaims,
    prior_loss_outcomes: history.priorLossOutcomes,
    prior_recovered_outcomes: history.priorRecoveredOutcomes,
    ticket_claim_type_confidence: context.ticket?.claimTypeConfidence ?? null,
    is_network_flagged: identity?.isNetworkFlagged ?? false,
  };
}
