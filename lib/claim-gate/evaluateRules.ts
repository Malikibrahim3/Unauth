import { formatClaimDecisionRecommendation } from '@/lib/claims/decision/format';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import type { ClaimDecisionEvaluation } from '@/lib/claims/decision/evaluate';
import type { ClaimGateDecision, ClaimGateEvidence, GateStatus, TriggeredGateRule } from '@/lib/claim-gate/types';

function gateStatusFor(result: ClaimDecisionEvaluation, evidence: ClaimGateEvidence): GateStatus {
  if (result.evaluation.recommendation === 'manual_review') return 'HOLD_FOR_REVIEW';
  if (result.evaluation.recommendation === 'deny') return 'ESCALATE';
  if (result.payoutCase.nextAction === 'request_customer_evidence') return 'NEED_MORE_EVIDENCE';
  if (evidence.summary.proof_of_delivery !== 'PRESENT' && evidence.summary.delivery_status === 'DELIVERED') {
    return 'NEED_MORE_EVIDENCE';
  }
  return 'PROCEED';
}

function nextStepFor(status: GateStatus): string {
  switch (status) {
    case 'ESCALATE':
      return 'Escalate to manager before refund or reship.';
    case 'HOLD_FOR_REVIEW':
      return 'Hold for review before refund or reship.';
    case 'NEED_MORE_EVIDENCE':
      return 'Ask for missing evidence before refund or reship.';
    case 'ERROR_MANUAL_REVIEW':
      return 'Manual review required because Unauth could not complete the gate check.';
    case 'PROCEED':
    default:
      return 'Proceed under normal merchant policy.';
  }
}

function allowedActionsFor(status: GateStatus): string[] {
  switch (status) {
    case 'ESCALATE':
      return ['ESCALATE_TO_MANAGER', 'ASK_FOR_MORE_EVIDENCE', 'OPEN_CARRIER_INVESTIGATION', 'OVERRIDE_WITH_REASON'];
    case 'HOLD_FOR_REVIEW':
      return ['ASK_FOR_MORE_EVIDENCE', 'ESCALATE_TO_MANAGER', 'OPEN_CARRIER_INVESTIGATION', 'OVERRIDE_WITH_REASON'];
    case 'NEED_MORE_EVIDENCE':
      return ['ASK_FOR_MORE_EVIDENCE', 'ESCALATE_TO_MANAGER'];
    case 'ERROR_MANUAL_REVIEW':
      return ['ESCALATE_TO_MANAGER'];
    case 'PROCEED':
    default:
      return ['CONTINUE_NORMAL_WORKFLOW'];
  }
}

function blockedActionsFor(status: GateStatus): string[] {
  switch (status) {
    case 'ESCALATE':
    case 'HOLD_FOR_REVIEW':
      return ['AUTO_REFUND', 'AUTO_RESHIP', 'AUTO_CLOSE'];
    case 'NEED_MORE_EVIDENCE':
    case 'ERROR_MANUAL_REVIEW':
      return ['AUTO_REFUND', 'AUTO_RESHIP'];
    case 'PROCEED':
    default:
      return [];
  }
}

function triggeredRulesFor(result: ClaimDecisionEvaluation): TriggeredGateRule[] {
  if (!result.evaluation.rule_name) return [];
  const formatted = formatClaimDecisionRecommendation(result.evaluation, result.ruleCount, result.payoutCase);
  return [
    {
      rule_id: result.evaluation.rule_id,
      rule_name: result.evaluation.rule_name,
      reason:
        formatted.matchedConditions.map((condition) => condition.actual ? `${condition.label} ${condition.actual}` : condition.label).join('; ') ||
        result.evaluation.justification ||
        'Merchant rule matched.',
    },
  ];
}

export async function evaluateGateRules(input: {
  client: Parameters<typeof evaluateClaimDecision>[0]['client'];
  merchantId: string;
  claimId: string;
  evidence: ClaimGateEvidence;
}): Promise<ClaimGateDecision> {
  const result = await evaluateClaimDecision({
    client: input.client,
    merchantId: input.merchantId,
    claimId: input.claimId,
    source: 'api',
    payoutInput: {
      refundAmount: input.evidence.moneyAtRisk,
    },
  });
  if (!result) {
    return {
      gateStatus: 'ERROR_MANUAL_REVIEW',
      triggeredRules: [],
      policyNextStep: nextStepFor('ERROR_MANUAL_REVIEW'),
      allowedActions: allowedActionsFor('ERROR_MANUAL_REVIEW'),
      blockedActions: blockedActionsFor('ERROR_MANUAL_REVIEW'),
      evaluation: null,
    };
  }
  const gateStatus = gateStatusFor(result, input.evidence);
  return {
    gateStatus,
    triggeredRules: triggeredRulesFor(result),
    policyNextStep: nextStepFor(gateStatus),
    allowedActions: allowedActionsFor(gateStatus),
    blockedActions: blockedActionsFor(gateStatus),
    evaluation: result.evaluation,
  };
}
