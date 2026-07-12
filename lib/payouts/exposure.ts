/**
 * lib/payouts/exposure.ts
 *
 * Computes payout exposure for a case: the sum of the support actions that would
 * move money (refund, reship/replacement, discount, store credit, support cost).
 * Pure; no scoring. When explicit amounts are absent it falls back to the claim's
 * amount-at-risk or the order total, recording the source for traceability.
 */
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import type {
  PayoutExposure,
  PayoutExposureComponent,
  PayoutExposureInput,
} from '@/lib/payouts/types';

function isAmount(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function computePayoutExposure(
  context: ClaimDecisionContext,
  input: PayoutExposureInput = {},
): PayoutExposure {
  const currency = context.claim.currency ?? context.order?.currency ?? null;
  const components: PayoutExposureComponent[] = [];
  const reasons: string[] = [];

  if (isAmount(input.refundAmount)) {
    components.push({
      kind: 'refund',
      amount: input.refundAmount,
      source: 'provided',
      reason: 'Refund amount provided on the case',
    });
  } else {
    // Fall back to the claim's amount at risk, then the order total.
    if (isAmount(context.claim.amountAtRisk)) {
      components.push({
        kind: 'refund',
        amount: context.claim.amountAtRisk,
        source: 'amount_at_risk',
        reason: 'No refund amount provided — using amount at risk',
      });
    } else if (isAmount(context.order?.totalAmount)) {
      components.push({
        kind: 'refund',
        amount: context.order!.totalAmount!,
        source: 'order_total',
        reason: 'No refund amount or amount at risk — using order total',
      });
    } else {
      reasons.push('No refund amount, amount at risk, or order total available');
    }
  }

  if (isAmount(input.reshipReplacementAmount)) {
    components.push({
      kind: 'reship_replacement',
      amount: input.reshipReplacementAmount,
      source: 'provided',
      reason: 'Reship / replacement cost provided on the case',
    });
  }
  if (isAmount(input.discountAmount)) {
    components.push({
      kind: 'discount',
      amount: input.discountAmount,
      source: 'provided',
      reason: 'Discount amount provided on the case',
    });
  }
  if (isAmount(input.storeCreditAmount)) {
    components.push({
      kind: 'store_credit',
      amount: input.storeCreditAmount,
      source: 'provided',
      reason: 'Store-credit amount provided on the case',
    });
  }
  if (isAmount(input.estimatedSupportCost)) {
    components.push({
      kind: 'support_cost',
      amount: input.estimatedSupportCost,
      source: 'estimated',
      reason: 'Estimated support handling cost',
    });
  }

  const totalAmount = components.reduce((sum, c) => sum + c.amount, 0);

  const reviewThreshold =
    typeof input.reviewThreshold === 'number' && Number.isFinite(input.reviewThreshold)
      ? input.reviewThreshold
      : null;

  let aboveReviewThreshold = false;
  if (reviewThreshold != null) {
    aboveReviewThreshold = totalAmount >= reviewThreshold;
    reasons.push(
      aboveReviewThreshold
        ? `Estimated total loss meets the review threshold of ${reviewThreshold}`
        : `Estimated total loss is within the review threshold of ${reviewThreshold}`,
    );
  } else {
    reasons.push('No review threshold supplied — exposure not flagged for review');
  }

  return {
    total: { amount: totalAmount, currency },
    components,
    aboveReviewThreshold,
    reviewThreshold,
    reasons,
  };
}
