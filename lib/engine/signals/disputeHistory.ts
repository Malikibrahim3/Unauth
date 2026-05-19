import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

// §1 — Consortium / dispute-history intelligence.
//
// This is the single highest-precision signal in the industry (Signifyd,
// Riskified, Forter, Stripe Radar, Kount, Chargeflow). Any customer whose
// history contains a chargeback, dispute, refund claim, or return claim is
// elevated for *all* future orders, because friendly-fraud is extraordinarily
// repeatable.
//
// Mirrors the implementation in lib/engine/fastScore.ts#disputeHistory so the
// eval harness and the live pipeline score identically. See the block comment
// there for scoring rationale.
//
// IMPORTANT: we only look at PRIOR orders (strictly earlier than the current
// one) — using the current order's own flags would leak the ground-truth
// label into the prediction.
export const disputeHistory: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];
  const prior = customerOrders.filter(
    (o) => o.orderId !== order.orderId && o.orderDate.getTime() < order.orderDate.getTime()
  );

  if (prior.length === 0) {
    return {
      name: 'disputeHistory',
      fired: false,
      score: 0,
      reason: 'No prior order history for this customer.',
      evidence: { priorOrderCount: 0 },
    };
  }

  const priorChargebacks = prior.filter((o) => o.chargebackDispute === true).length;
  const priorRefundRequests = prior.filter((o) => o.refundRequested === true).length;
  const priorReturnRequests = prior.filter((o) => o.returnRequested === true).length;
  const priorActualRefunds = prior.filter(
    (o) => o.refundStatus === 'full' || o.refundStatus === 'partial' || o.orderStatus === 'refunded'
  ).length;

  const hasExplicitFlags = prior.some(
    (o) =>
      (o.chargebackDispute !== null && o.chargebackDispute !== undefined) ||
      (o.refundRequested !== null && o.refundRequested !== undefined) ||
      (o.returnRequested !== null && o.returnRequested !== undefined)
  );

  // Tuning fix 1 — gate refund/return-request firing on rate, not raw count.
  // US apparel/electronics has 20-30% legitimate return rates; firing on a
  // single prior refund treats normal customers as fraud. We now require:
  //   - chargebacks: always fire (rare and strongly fraud-correlated)
  //   - refund/return requests: ≥2 events AND dispute rate above threshold
  //   - rate >0.40 with ≥3 events → full weight (score 60); otherwise 0.25+ → half (score 30)
  let score = 0;
  const reasons: string[] = [];

  const softDisputeEvents = priorRefundRequests + priorReturnRequests;
  const softDisputeRate = prior.length > 0 ? softDisputeEvents / prior.length : 0;

  if (priorChargebacks > 0) {
    // Chargebacks are unchanged — the strongest signal in the industry.
    score = Math.max(score, priorChargebacks >= 2 ? 100 : 95);
    reasons.push(`${priorChargebacks} prior chargeback${priorChargebacks > 1 ? 's' : ''}`);
  }

  if (softDisputeEvents >= 3 && softDisputeRate > 0.40) {
    score = Math.max(score, softDisputeEvents >= 4 ? 80 : 60);
    reasons.push(
      `${softDisputeEvents} prior dispute event${softDisputeEvents > 1 ? 's' : ''} ` +
        `(${(softDisputeRate * 100).toFixed(0)}% of ${prior.length} prior orders)`,
    );
  } else if (softDisputeEvents >= 2 && softDisputeRate >= 0.25) {
    score = Math.max(score, 30);
    reasons.push(
      `${softDisputeEvents} prior dispute event${softDisputeEvents > 1 ? 's' : ''} ` +
        `(${(softDisputeRate * 100).toFixed(0)}% of ${prior.length} prior orders, below high-confidence threshold)`,
    );
  }
  // softDisputeRate below 0.25 or fewer than 2 events: do not fire.

  // Fallback for merchants that don't supply explicit dispute flags but do
  // record refund status on the order itself.
  if (!hasExplicitFlags && priorActualRefunds >= 2) {
    const actualRefundRate = priorActualRefunds / prior.length;
    if (actualRefundRate > 0.40) {
      score = Math.max(score, 50);
      reasons.push(`${priorActualRefunds} prior refunds (${(actualRefundRate * 100).toFixed(0)}% rate, no explicit dispute flags)`);
    } else if (actualRefundRate >= 0.25) {
      score = Math.max(score, 25);
      reasons.push(`${priorActualRefunds} prior refunds (${(actualRefundRate * 100).toFixed(0)}% rate, no explicit dispute flags)`);
    }
  }

  if (score === 0) {
    return {
      name: 'disputeHistory',
      fired: false,
      score: 0,
      reason: 'No prior disputes, refund requests, or return requests on this customer.',
      evidence: { priorOrderCount: prior.length, priorChargebacks, priorRefundRequests, priorReturnRequests, priorActualRefunds },
    };
  }

  return {
    name: 'disputeHistory',
    fired: true,
    score,
    reason: `Customer has ${reasons.join(', ')} across ${prior.length} prior order${prior.length > 1 ? 's' : ''} — consortium / dispute-history elevation.`,
    evidence: { priorOrderCount: prior.length, priorChargebacks, priorRefundRequests, priorReturnRequests, priorActualRefunds, hasExplicitFlags },
  };
};
