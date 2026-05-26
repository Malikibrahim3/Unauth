import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

const SUSPICIOUS_HOURS = 120;

export const inrSpeed: Signal = (order: NormalisedOrder, _context?: ScoringContext): SignalResult => {
  if (order.refundReason !== 'inr' || !order.refundDate) {
    return {
      name: 'inrSpeed',
      fired: false,
      score: 0,
      reason: 'Order is not an INR claim or has no refund date.',
      evidence: {},
    };
  }

  const hoursToRefund =
    (order.refundDate.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60);
  const hasDeliveryEvidence = order.deliveryStatus === 'delivered' || !!order.deliveredAt;
  const claimAfterDelivery = !!order.deliveredAt && order.refundDate.getTime() >= order.deliveredAt.getTime();

  if (!hasDeliveryEvidence) {
    return {
      name: 'inrSpeed',
      fired: false,
      score: 0,
      reason: 'INR timing present but delivery confirmation is missing; no high-severity inference.',
      evidence: { hoursToRefund, hasDeliveryEvidence: false },
    };
  }

  if (hoursToRefund >= SUSPICIOUS_HOURS || !claimAfterDelivery) {
    return {
      name: 'inrSpeed',
      fired: false,
      score: 0,
      reason: `INR claim made ${hoursToRefund.toFixed(0)}h after order — within expected delivery window.`,
      evidence: { hoursToRefund, hasDeliveryEvidence, claimAfterDelivery },
    };
  }

  return {
    name: 'inrSpeed',
    fired: true,
    score: 80,
    reason: `Customer claimed item not received ${hoursToRefund.toFixed(0)} hours after placing the order — too fast for the item to have been delivered and found missing (typical UK delivery is 2–5 days).`,
    evidence: {
      hoursToRefund,
      hasDeliveryEvidence,
      claimAfterDelivery,
      orderDate: order.orderDate.toISOString(),
      refundDate: order.refundDate.toISOString(),
    },
  };
};
