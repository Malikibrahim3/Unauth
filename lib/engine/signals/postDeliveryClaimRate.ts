import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

export const postDeliveryClaimRate: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];
  const deliveredOrders = customerOrders.filter((o) => o.deliveryStatus === 'delivered' || !!o.deliveredAt);
  if (deliveredOrders.length === 0) {
    return {
      name: 'postDeliveryClaimRate',
      fired: false,
      score: 0,
      reason: 'No delivered orders in customer history; post-delivery claim rate unavailable.',
      evidence: { deliveredOrders: 0, postDeliveryClaims: 0, smoothedRate: 0 },
      identifierTypesUsed: [],
    };
  }

  const postDeliveryClaims = deliveredOrders.filter((o) => {
    const isINR = o.refundReason === 'inr';
    const hasRefundEvent = o.refundRequested === true || o.refundStatus === 'full' || o.refundStatus === 'partial';
    const hasDeliveryEvidence = o.deliveryStatus === 'delivered' || !!o.deliveredAt;
    return isINR && hasRefundEvent && hasDeliveryEvidence;
  }).length;

  const rawRate = postDeliveryClaims / deliveredOrders.length;
  const smoothedRate = (postDeliveryClaims + 1) / (deliveredOrders.length + 5);

  if (deliveredOrders.length < 3 || postDeliveryClaims < 2 || smoothedRate < 0.3) {
    return {
      name: 'postDeliveryClaimRate',
      fired: false,
      score: 0,
      reason: `Post-delivery INR claims ${postDeliveryClaims}/${deliveredOrders.length} (${(rawRate * 100).toFixed(0)}% raw, ${(smoothedRate * 100).toFixed(0)}% smoothed) below evidence threshold.`,
      evidence: { deliveredOrders: deliveredOrders.length, postDeliveryClaims, rawRate, smoothedRate },
      identifierTypesUsed: [],
    };
  }

  const score = smoothedRate >= 0.45 ? 80 : 60;
  return {
    name: 'postDeliveryClaimRate',
    fired: true,
    score,
    reason: `Customer repeatedly claims INR after confirmed delivery: ${postDeliveryClaims}/${deliveredOrders.length} delivered orders (${(smoothedRate * 100).toFixed(0)}% smoothed).`,
    evidence: { deliveredOrders: deliveredOrders.length, postDeliveryClaims, rawRate, smoothedRate },
    identifierTypesUsed: ['email'],
  };
};

