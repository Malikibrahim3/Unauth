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

  // Precision fix — disputeHistory must fire ONLY on actual chargeback /
  // dispute evidence. Plain refund requests, return requests, and refunded
  // order status are NOT disputes (they are returns) — legitimate high-return
  // shoppers (e.g. 40% return rate cohorts) generated mass false positives
  // when those events were treated as soft disputes. Chargebacks remain the
  // sole trigger; the score table for chargebacks is unchanged.
  let score = 0;
  const reasons: string[] = [];

  if (priorChargebacks > 0) {
    score = priorChargebacks >= 2 ? 100 : 95;
    reasons.push(`${priorChargebacks} prior chargeback${priorChargebacks > 1 ? 's' : ''}`);
  }

  if (score === 0) {
    return {
      name: 'disputeHistory',
      fired: false,
      score: 0,
      reason: 'No prior chargebacks on this customer.',
      evidence: { priorOrderCount: prior.length, priorChargebacks, priorRefundRequests, priorReturnRequests, priorActualRefunds },
    };
  }

  return {
    name: 'disputeHistory',
    fired: true,
    score,
    reason: `Customer has ${reasons.join(', ')} across ${prior.length} prior order${prior.length > 1 ? 's' : ''} — consortium / dispute-history elevation.`,
    evidence: { priorOrderCount: prior.length, priorChargebacks, priorRefundRequests, priorReturnRequests, priorActualRefunds },
  };
};
