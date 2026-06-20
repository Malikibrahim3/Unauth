/**
 * lib/payouts/supportPayoutCase.ts
 *
 * Pure assembler: turns a ClaimDecisionContext (built from the DB elsewhere) plus
 * optional caller-supplied exposure/action inputs into a SupportPayoutCase view.
 * No IO. This is the single entry point the decision pipeline and UI consume.
 */
import { toCanonicalClaimType } from '@/lib/claims/claimTypes';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import { deriveLossAttribution } from '@/lib/payouts/attribution';
import { buildEvidenceChecklist } from '@/lib/payouts/evidenceChecklist';
import { computePayoutExposure } from '@/lib/payouts/exposure';
import { deriveRecoveryPath } from '@/lib/payouts/recovery';
import { reconcileRequestedActions } from '@/lib/payouts/requestedAction';
import { derivePayoutWorkflow, withWorkflow } from '@/lib/payouts/workflow';
import {
  PAYOUT_CONFIG_VERSION,
  type BuildSupportPayoutCaseInput,
  type PayoutClaimType,
  type SupportPayoutCase,
} from '@/lib/payouts/types';

/**
 * Resolve the product-level claim type. Uses the caller override first (e.g. a
 * future ticket classifier or demo/tests that distinguish `missing_item`),
 * otherwise the canonical DB claim type. Returns null when unknown.
 */
export function resolvePayoutClaimType(
  context: ClaimDecisionContext,
  override?: PayoutClaimType | null,
): PayoutClaimType | null {
  if (override) return override;
  const raw = context.claim.type;
  if (!raw) return null;
  return toCanonicalClaimType(raw);
}

export function buildSupportPayoutCase(
  context: ClaimDecisionContext,
  input: BuildSupportPayoutCaseInput = {},
): SupportPayoutCase {
  const claimType = resolvePayoutClaimType(context, input.claimTypeOverride ?? null);

  const exposure = computePayoutExposure(context, {
    refundAmount: input.refundAmount,
    reshipReplacementAmount: input.reshipReplacementAmount,
    discountAmount: input.discountAmount,
    storeCreditAmount: input.storeCreditAmount,
    estimatedSupportCost: input.estimatedSupportCost,
    reviewThreshold: input.reviewThreshold,
  });

  const requestedAction = reconcileRequestedActions({
    claimType,
    requestedActions: input.requestedActions ?? null,
    returnRequired: input.returnRequired ?? null,
  });

  const evidence = buildEvidenceChecklist(context, claimType);
  const attribution = deriveLossAttribution(context, claimType);
  const recovery = deriveRecoveryPath(attribution, evidence);
  const workflow = derivePayoutWorkflow({
    claimType,
    currentStatus: context.claim.status,
    evidence,
    recovery,
    requestedAction,
    exposureAboveReviewThreshold: exposure.aboveReviewThreshold,
    agentDecision: input.agentDecision ?? null,
  });

  return withWorkflow({
    caseId: context.claim.id,
    merchantId: context.merchantId,
    claimType,
    exposure,
    requestedAction,
    evidence,
    attribution,
    recovery,
    matchedRule: input.matchedRule ?? null,
    recommendation: input.recommendation ?? null,
    agentDecision: input.agentDecision ?? null,
    outcome: input.outcome ?? null,
    configVersion: PAYOUT_CONFIG_VERSION,
  }, workflow, input.clarificationRequests ?? []);
}
