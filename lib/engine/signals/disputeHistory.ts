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

  let score = 0;
  const reasons: string[] = [];

  if (priorChargebacks > 0) {
    score = Math.max(score, priorChargebacks >= 2 ? 100 : 95);
    reasons.push(`${priorChargebacks} prior chargeback${priorChargebacks > 1 ? 's' : ''}`);
  }
  if (priorRefundRequests > 0) {
    score = Math.max(score, priorRefundRequests >= 3 ? 80 : priorRefundRequests >= 2 ? 70 : 60);
    reasons.push(`${priorRefundRequests} prior refund request${priorRefundRequests > 1 ? 's' : ''}`);
  }
  if (priorReturnRequests > 0) {
    score = Math.max(score, priorReturnRequests >= 3 ? 70 : priorReturnRequests >= 2 ? 60 : 50);
    reasons.push(`${priorReturnRequests} prior return request${priorReturnRequests > 1 ? 's' : ''}`);
  }
  if (!hasExplicitFlags && priorActualRefunds > 0) {
    score = Math.max(score, priorActualRefunds >= 2 ? 50 : 40);
    reasons.push(`${priorActualRefunds} prior refund${priorActualRefunds > 1 ? 's' : ''} on record`);
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
