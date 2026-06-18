/**
 * Maps ClaimDecisionContext to the signal shape consumed by evaluateRules().
 *
 * Count semantics (documented for merchant rules):
 * - merchant_claim_count: all claims at this store for this identity, including current
 * - merchant_prior_claim_count: prior claims at this store excluding current
 * - merchant_same_type_claim_count: same-type claims including current
 * - merchant_prior_same_type_claim_count: same-type prior claims excluding current
 */
import type { ConfidenceGrade, EvidenceLevel, IdentitySignals } from '@/lib/rules-engine';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';

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
  network_same_type_claim_count?: number | null;
  prior_approved_claims?: number;
  prior_denied_claims?: number;
  prior_escalated_claims?: number;
  prior_chargebacks_after_claims?: number;
  prior_loss_outcomes?: number;
  prior_recovered_outcomes?: number;
  ticket_claim_type_confidence?: number | null;
};

const DEFAULT_GRADE: ConfidenceGrade = 'weak';
const DEFAULT_EVIDENCE_LEVEL: EvidenceLevel = 'minimal';

export function claimDecisionContextToSignals(context: ClaimDecisionContext): ClaimDecisionSignals {
  const { claim, order, delivery, identity, history, evidence } = context;

  const orderValue =
    claim.amountAtRisk ??
    order?.totalAmount ??
    null;

  return {
    confidence_grade: (identity?.confidenceGrade ?? DEFAULT_GRADE) as ConfidenceGrade,
    network_claim_count: history.networkClaimCount ?? 0,
    merchant_claim_count: history.merchantClaimCount,
    days_since_last_claim: history.daysSinceLastClaim,
    has_cross_merchant_identity: history.hasCrossMerchantIdentity,
    network_merchant_count: history.networkMerchantCount,
    claim_types: history.claimTypes,
    order_value_usd: orderValue,
    account_age_days: history.accountAgeDays,
    is_network_flagged: identity?.isNetworkFlagged ?? false,
    evidence_score: identity?.evidenceScore ?? 0,
    evidence_level: (identity?.evidenceLevel ?? DEFAULT_EVIDENCE_LEVEL) as EvidenceLevel,
    has_sufficient_data: identity?.hasSufficientData ?? false,

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
    network_same_type_claim_count: history.networkSameTypeClaimCount,
    prior_approved_claims: history.priorApprovedClaims,
    prior_denied_claims: history.priorDeniedClaims,
    prior_escalated_claims: history.priorEscalatedClaims,
    prior_chargebacks_after_claims: history.priorChargebacksAfterClaims,
    prior_loss_outcomes: history.priorLossOutcomes,
    prior_recovered_outcomes: history.priorRecoveredOutcomes,
    ticket_claim_type_confidence: context.ticket?.claimTypeConfidence ?? null,
  };
}
