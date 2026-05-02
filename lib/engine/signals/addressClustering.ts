import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

export const addressClustering: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  if (!order.addressHash) {
    return {
      name: 'addressClustering',
      fired: false,
      score: 0,
      reason: 'No address hash available.',
      evidence: {},
    };
  }

  const ordersAtAddress = context.allOrders.filter(
    (o: NormalisedOrder) => o.addressHash === order.addressHash
  );

  const distinctEmails = new Set(ordersAtAddress.map((o: NormalisedOrder) => o.emailHash));

  if (distinctEmails.size < 3) {
    return {
      name: 'addressClustering',
      fired: false,
      score: 0,
      reason: `Only ${distinctEmails.size} distinct email(s) share this address — below the clustering threshold.`,
      evidence: { distinctEmailCount: distinctEmails.size },
    };
  }

  const score = Math.min(80, 30 + 10 * (distinctEmails.size - 3));

  return {
    name: 'addressClustering',
    fired: true,
    score,
    reason: `${distinctEmails.size} distinct email addresses have placed orders to this shipping address — consistent with an organised returns fraud ring.`,
    evidence: {
      distinctEmailCount: distinctEmails.size,
      totalOrdersAtAddress: ordersAtAddress.length,
    },
  };
};
