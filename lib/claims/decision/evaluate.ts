/**
 * Claim-scoped rule evaluation — shared by in-app review and Gorgias widget.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildClaimDecisionContext } from '@/lib/claims/decision/context';
import { ensureClaimDecisionEvidence } from '@/lib/claims/decision/ensureEvidence';
import { claimDecisionContextToSignals } from '@/lib/claims/decision/signals';
import type { ClaimDecisionContext, ClaimDecisionEvaluationSource } from '@/lib/claims/decision/types';
import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { resolvePayoutRecommendation } from '@/lib/payouts/recommendation';
import { derivePayoutWorkflow, withWorkflow } from '@/lib/payouts/workflow';
import type { BuildSupportPayoutCaseInput, SupportPayoutCase } from '@/lib/payouts/types';
import {
  evaluateRules,
  type RuleEvaluationResult,
} from '@/lib/rules-engine';
import {
  fetchActiveMerchantRules,
  writeClaimRuleEvaluationAudit,
  type RuleAuditStatus,
} from '@/lib/rules/store';
import { TABLES } from '@/lib/supabase/tables';

export type ClaimDecisionEvaluation = {
  context: ClaimDecisionContext;
  evaluation: RuleEvaluationResult;
  payoutCase: SupportPayoutCase;
  ruleCount: number;
  evaluatedAt: string;
  auditStatus: RuleAuditStatus;
};

async function persistSupportPayoutCaseDecision(input: {
  client: SupabaseClient;
  merchantId: string;
  claimId: string;
  payoutCase: SupportPayoutCase;
}): Promise<void> {
  const { payoutCase } = input;
  const { error } = await input.client
    .from(TABLES.MERCHANT_CLAIMS)
    .update({
      total_estimated_loss: payoutCase.exposure.total.amount,
      requested_action: payoutCase.requestedAction.primary,
      requires_review: payoutCase.exposure.aboveReviewThreshold,
      loss_attribution: payoutCase.attribution.label,
      attribution_confidence: payoutCase.attribution.confidence,
      recoverability: payoutCase.recovery.recoverability,
      recovery_owner: payoutCase.recovery.likelyOwner,
      recovery_required_evidence: payoutCase.recovery.requiredEvidence,
      recovery_next_action: payoutCase.recovery.suggestedNextAction,
      recommended_payout_action: payoutCase.recommendation?.action ?? null,
      recommended_rule_name: payoutCase.recommendation?.ruleName ?? null,
      recommended_rule_id: payoutCase.recommendation?.ruleId ?? null,
      status: payoutCase.status,
      payout_decision_state: payoutCase.payoutDecisionState,
      recovery_state: payoutCase.recoveryState,
      next_action: payoutCase.nextAction,
      next_action_reason: payoutCase.nextActionReason,
    })
    .eq('id', input.claimId)
    .eq('merchant_id', input.merchantId);

  if (error) {
    throw new Error(`Failed to persist payout case decision: ${error.message}`);
  }
}

export async function evaluateClaimDecision(input: {
  client: SupabaseClient;
  merchantId: string;
  claimId: string;
  actorId?: string | null;
  source: ClaimDecisionEvaluationSource;
  attachDeliveryEvidence?: boolean;
  /** Optional payout exposure / requested-action inputs for the SupportPayoutCase. */
  payoutInput?: BuildSupportPayoutCaseInput;
}): Promise<ClaimDecisionEvaluation | null> {
  if (input.attachDeliveryEvidence !== false) {
    const { data: claimRow } = await input.client
      .from(TABLES.MERCHANT_CLAIMS)
      .select('claim_type, source_order_id')
      .eq('id', input.claimId)
      .eq('merchant_id', input.merchantId)
      .maybeSingle();
    if (claimRow) {
      await ensureClaimDecisionEvidence({
        client: input.client,
        merchantId: input.merchantId,
        claimId: input.claimId,
        claimType: (claimRow.claim_type as string) ?? null,
        sourceOrderId: (claimRow.source_order_id as string) ?? null,
        source: 'pre_evaluation',
      });
    }
  }

  const context = await buildClaimDecisionContext(
    input.client,
    input.merchantId,
    input.claimId,
  );
  if (!context) return null;

  const payoutCaseBase = buildSupportPayoutCase(context, input.payoutInput);
  const signals = claimDecisionContextToSignals(context, payoutCaseBase);
  const rules = await fetchActiveMerchantRules(input.client, input.merchantId);
  const evaluation = evaluateRules(signals, rules);
  const recommendation = resolvePayoutRecommendation(evaluation, payoutCaseBase);
  const workflow = derivePayoutWorkflow({
    claimType: payoutCaseBase.claimType,
    currentStatus: context.claim.status,
    evidence: payoutCaseBase.evidence,
    recovery: payoutCaseBase.recovery,
    requestedAction: payoutCaseBase.requestedAction,
    exposureAboveReviewThreshold: payoutCaseBase.exposure.aboveReviewThreshold,
    evaluation,
    agentDecision: payoutCaseBase.agentDecision,
  });
  const payoutCase = withWorkflow(
    { ...payoutCaseBase, recommendation },
    workflow,
    payoutCaseBase.clarificationRequests,
  );
  const evaluatedAt = new Date().toISOString();

  await persistSupportPayoutCaseDecision({
    client: input.client,
    merchantId: input.merchantId,
    claimId: input.claimId,
    payoutCase,
  });

  const auditStatus = await writeClaimRuleEvaluationAudit(input.client, {
    merchantId: input.merchantId,
    claimId: input.claimId,
    identityId: context.claim.identityId,
    sourceTicketId: context.claim.sourceTicketId,
    signals,
    rules,
    result: evaluation,
    evaluationSource: input.source,
    actorId: input.actorId ?? null,
    evaluatedAt,
  });

  return {
    context,
    evaluation,
    payoutCase,
    ruleCount: rules.length,
    evaluatedAt,
    auditStatus,
  };
}
