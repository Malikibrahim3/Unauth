import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

export const inrAbuse: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];

  const inrCount = customerOrders.filter((o: NormalisedOrder) => o.refundReason === 'inr').length;

  if (inrCount < 2) {
    return {
      name: 'inrAbuse',
      fired: false,
      score: 0,
      reason: 'Customer has fewer than 2 INR claims.',
      evidence: { inrCount },
    };
  }

  const scoreMap: Record<number, number> = { 2: 40, 3: 70 };
  const score = inrCount >= 4 ? 95 : (scoreMap[inrCount] ?? 40);

  return {
    name: 'inrAbuse',
    fired: true,
    score,
    reason: `Customer has made ${inrCount} "item not received" claims across their order history.`,
    evidence: {
      inrCount,
      totalOrders: customerOrders.length,
    },
  };
};
