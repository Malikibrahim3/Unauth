/**
 * Claim-scoped rule evaluation — shared by in-app review and Gorgias widget.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildClaimDecisionContext } from '@/lib/claims/decision/context';
import { ensureClaimDecisionEvidence } from '@/lib/claims/decision/ensureEvidence';
import { claimDecisionContextToSignals } from '@/lib/claims/decision/signals';
import type { ClaimDecisionContext, ClaimDecisionEvaluationSource } from '@/lib/claims/decision/types';
import {
  evaluateRules,
  type RuleEvaluationResult,
} from '@/lib/rules-engine';
import {
  fetchActiveMerchantRules,
  writeClaimRuleEvaluationAudit,
  type RuleAuditStatus,
} from '@/lib/rules/store';

export type ClaimDecisionEvaluation = {
  context: ClaimDecisionContext;
  evaluation: RuleEvaluationResult;
  ruleCount: number;
  evaluatedAt: string;
  auditStatus: RuleAuditStatus;
};

export async function evaluateClaimDecision(input: {
  client: SupabaseClient;
  merchantId: string;
  claimId: string;
  actorId?: string | null;
  source: ClaimDecisionEvaluationSource;
  attachDeliveryEvidence?: boolean;
}): Promise<ClaimDecisionEvaluation | null> {
  if (input.attachDeliveryEvidence !== false) {
    const { data: claimRow } = await input.client
      .from('claims')
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

  const signals = claimDecisionContextToSignals(context);
  const rules = await fetchActiveMerchantRules(input.client, input.merchantId);
  const evaluation = evaluateRules(signals, rules);
  const evaluatedAt = new Date().toISOString();

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
    ruleCount: rules.length,
    evaluatedAt,
    auditStatus,
  };
}
