import type { Signal, SignalResult, NormalisedOrder, ScoringContext } from '../types';

/**
 * Refund-acceleration signal.
 *
 * Built by Fix 3. The signal weight (`refundPattern: 20`) was configured in
 * weights.ts but no implementation existed. This is the minimum viable
 * version per the tuning brief:
 *   - len(dates) ≥ 3 AND avg interval between last 3 claims < 5 days → score 40
 *   - len(dates) ≥ 2 AND most recent claim within 3 days of previous → score 25
 *   - otherwise: not fired
 *
 * "Acceleration" = the time between refund claims is shortening across a
 * customer's order history. This is the canonical signature of serial INR
 * claimers learning what works — early orders have multi-week gaps between
 * refunds while later orders have refund claims filed within days. The
 * inrSpeed signal looks at order→refund latency; this signal looks at
 * refund→refund cadence.
 */
export const refundPattern: Signal = (
  order: NormalisedOrder,
  context: ScoringContext,
): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];
  // Look only at PRIOR orders (strictly before the current order's date) that
  // had a refund claim filed. Including the current order would leak the
  // ground-truth label into the prediction.
  const priorRefundDates: number[] = [];
  for (const o of customerOrders) {
    if (o.orderId === order.orderId) continue;
    if (o.orderDate.getTime() >= order.orderDate.getTime()) continue;
    const hadRefund =
      o.refundRequested === true ||
      o.refundStatus === 'full' ||
      o.refundStatus === 'partial' ||
      o.orderStatus === 'refunded';
    if (!hadRefund) continue;
    const refDate = o.refundDate ? o.refundDate.getTime() : o.orderDate.getTime();
    priorRefundDates.push(refDate);
  }
  if (priorRefundDates.length < 2) {
    return {
      name: 'refundPattern',
      fired: false,
      score: 0,
      reason: 'Fewer than 2 prior refund claims — no acceleration to evaluate.',
      evidence: { priorRefundClaimCount: priorRefundDates.length },
      identifierTypesUsed: [],
    };
  }
  priorRefundDates.sort((a, b) => a - b);

  // Tier 1 — three or more priors: average of the last 3 intervals.
  if (priorRefundDates.length >= 3) {
    const lastThree = priorRefundDates.slice(-3);
    // intervals between consecutive of the last 3 — that's 2 intervals.
    const intervals: number[] = [];
    for (let i = 1; i < lastThree.length; i++) {
      intervals.push((lastThree[i] - lastThree[i - 1]) / 86400000);
    }
    const avgIntervalDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgIntervalDays < 5) {
      return {
        name: 'refundPattern',
        fired: true,
        score: 40,
        reason: `Refund claim acceleration detected — last 3 claims averaged ${avgIntervalDays.toFixed(1)} days apart (< 5-day threshold).`,
        evidence: {
          priorRefundClaimCount: priorRefundDates.length,
          avgIntervalDaysLast3: avgIntervalDays,
        },
        identifierTypesUsed: ['email'],
      };
    }
  }

  // Tier 2 — two or more priors: most recent two within 3 days.
  const lastTwo = priorRefundDates.slice(-2);
  const lastIntervalDays = (lastTwo[1] - lastTwo[0]) / 86400000;
  if (lastIntervalDays <= 3) {
    return {
      name: 'refundPattern',
      fired: true,
      score: 25,
      reason: `Two refund claims within ${lastIntervalDays.toFixed(1)} days — possible acceleration.`,
      evidence: {
        priorRefundClaimCount: priorRefundDates.length,
        lastIntervalDays,
      },
      identifierTypesUsed: ['email'],
    };
  }

  return {
    name: 'refundPattern',
    fired: false,
    score: 0,
    reason: 'Prior refund claims present but no acceleration pattern.',
    evidence: { priorRefundClaimCount: priorRefundDates.length, lastIntervalDays },
    identifierTypesUsed: [],
  };
};
