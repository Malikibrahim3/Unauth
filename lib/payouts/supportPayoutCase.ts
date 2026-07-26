/**
 * lib/payouts/supportPayoutCase.ts
 *
 * Pure assembler: turns a ClaimDecisionContext (built from the DB elsewhere) plus
 * optional caller-supplied exposure/action inputs into a SupportPayoutCase view.
 * No IO. This is the single entry point the decision pipeline and UI consume.
 */
import { toCanonicalClaimType } from '@/lib/claims/claimTypes';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import { formatDeliveryEvidenceLine } from '@/lib/integrations/trackingEvidenceSlice';
import { deriveLossAttribution } from '@/lib/payouts/attribution';
import { buildEvidenceChecklist } from '@/lib/payouts/evidenceChecklist';
import { computePayoutExposure } from '@/lib/payouts/exposure';
import { deriveRecoveryPath } from '@/lib/payouts/recovery';
import { reconcileRequestedActions } from '@/lib/payouts/requestedAction';
import { toStoredClaimType, toSupportPayoutCaseReason } from '@/lib/payouts/taxonomy';
import { derivePayoutWorkflow, withWorkflow } from '@/lib/payouts/workflow';
import {
  PAYOUT_CONFIG_VERSION,
  type BuildSupportPayoutCaseInput,
  type PayoutClaimType,
  type SupportPayoutCase,
} from '@/lib/payouts/types';

/**
 * Resolve the product-level claim type. The normalized case issue is
 * authoritative because the compatibility `claim_type` column intentionally
 * stores both whole-parcel INR and partial-order missing-item as
 * `item_not_received`.
 */
export function resolvePayoutClaimType(
  context: ClaimDecisionContext,
  override?: PayoutClaimType | null,
): PayoutClaimType | null {
  if (override) return override;
  const normalizedIssue = toSupportPayoutCaseReason(
    context.claim.type,
    context.claim.reasonNormalized,
  );
  if (normalizedIssue === 'missing_item') return 'missing_item';
  const issueClaimType = toStoredClaimType(normalizedIssue);
  if (issueClaimType) return issueClaimType;
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
  const deliveryEvidenceLine = formatDeliveryEvidenceLine(context.delivery);
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
    deliveryEvidenceLine,
    attribution,
    recovery,
    matchedRule: input.matchedRule ?? null,
    recommendation: input.recommendation ?? null,
    agentDecision: input.agentDecision ?? null,
    outcome: input.outcome ?? null,
    configVersion: PAYOUT_CONFIG_VERSION,
  }, workflow, input.clarificationRequests ?? []);
}
