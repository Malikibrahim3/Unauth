/**
 * Steering-aligned payout recommendation vocabulary (docs/product/MVP_STEERING.md §16).
 *
 * Merchant rules still evaluate to approve | manual_review | deny internally.
 * This layer maps rule output + payout case context into operational recommendations.
 */
import type { RuleEvaluationResult } from '@/lib/rules-engine';
import type {
  PayoutRecommendation,
  PayoutRecommendationResult,
  SupportPayoutCase,
} from '@/lib/payouts/types';
import { derivePayoutWorkflow } from '@/lib/payouts/workflow';

export { PAYOUT_RECOMMENDATION_VALUES as PAYOUT_RECOMMENDATIONS } from '@/lib/payouts/types';

export const PAYOUT_RECOMMENDATION_LABELS: Record<PayoutRecommendation, string> = {
  approve_payout: 'Approve payout',
  deny_under_policy: 'Deny under policy',
  request_customer_evidence: 'Request customer evidence',
  ask_carrier_for_clarification: 'Ask carrier for clarification',
  ask_3pl_for_clarification: 'Ask 3PL for clarification',
  ask_supplier_for_clarification: 'Ask supplier for clarification',
  escalate_internal_review: 'Escalate internal review',
  open_recovery: 'Open recovery',
  wait_for_response: 'Wait for response',
  close_case: 'Close case',
};

export function payoutRecommendationLabel(action: PayoutRecommendation): string {
  return PAYOUT_RECOMMENDATION_LABELS[action];
}

export function resolvePayoutRecommendation(
  evaluation: RuleEvaluationResult,
  payoutCase: SupportPayoutCase,
): PayoutRecommendationResult | null {
  if (evaluation.recommendation === 'no_match') return null;

  const { evidence, recovery } = payoutCase;
  const ruleName = evaluation.rule_name;
  const ruleId = evaluation.rule_id;
  const workflow = derivePayoutWorkflow({
    claimType: payoutCase.claimType,
    currentStatus: payoutCase.status === 'closed' ? payoutCase.status : null,
    evidence,
    recovery,
    requestedAction: payoutCase.requestedAction,
    exposureAboveReviewThreshold: payoutCase.exposure.aboveReviewThreshold,
    evaluation,
    agentDecision: payoutCase.agentDecision,
  });

  const explanation =
    workflow.nextActionReason ||
    evaluation.justification_lines[0] ||
    evaluation.justification ||
    'Merchant rule matched this support payout case.';

  return {
    action: workflow.nextAction,
    ruleName,
    ruleId,
    explanation,
    openRecovery: workflow.openRecovery,
    requestedEvidence: workflow.requestedEvidence,
  };
}

export function formatPayoutRecommendationRuleLine(result: PayoutRecommendationResult): string {
  const label = payoutRecommendationLabel(result.action);
  const rule = result.ruleName ?? 'merchant policy';
  return `Rule: ${rule}. ${label}`;
}

/** Compare a recorded merchant outcome to the recommendation active at decision time. */
export function computeFollowedRecommendation(input: {
  recommendedAction: PayoutRecommendation | null | undefined;
  decision: string;
  outcome: string;
}): boolean | null {
  const { recommendedAction, decision, outcome } = input;
  if (!recommendedAction) return null;

  switch (recommendedAction) {
    case 'approve_payout':
      return decision === 'approved';
    case 'open_recovery':
      return decision === 'approved' || outcome === 'recovered';
    case 'deny_under_policy':
      return decision === 'denied';
    case 'request_customer_evidence':
    case 'ask_carrier_for_clarification':
    case 'ask_3pl_for_clarification':
    case 'ask_supplier_for_clarification':
    case 'wait_for_response':
      return decision === 'manual_review' || outcome === 'evidence_requested';
    case 'escalate_internal_review':
      return decision === 'manual_review' || decision === 'escalated';
    case 'close_case':
      return outcome !== 'pending';
    default:
      return null;
  }
}
