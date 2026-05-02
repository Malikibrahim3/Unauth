import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

const WINDOW_DAYS = 90;

export const paymentChurn: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];

  const cutoff = new Date(order.orderDate.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const recentOrders = customerOrders.filter(
    (o: NormalisedOrder) => o.orderDate >= cutoff && o.paymentMethod
  );

  const distinctMethods = new Set(
    recentOrders.map((o: NormalisedOrder) => o.paymentMethod?.toLowerCase())
  );

  if (distinctMethods.size < 4) {
    return {
      name: 'paymentChurn',
      fired: false,
      score: 0,
      reason: `Customer used ${distinctMethods.size} distinct payment method(s) in the last 90 days — below the threshold.`,
      evidence: { distinctMethodCount: distinctMethods.size, windowDays: WINDOW_DAYS },
    };
  }

  return {
    name: 'paymentChurn',
    fired: true,
    score: 60,
    reason: `Customer used ${distinctMethods.size} distinct payment methods within a 90-day window, which is consistent with testing multiple stolen or compromised payment instruments.`,
    evidence: {
      distinctMethodCount: distinctMethods.size,
      windowDays: WINDOW_DAYS,
      recentOrderCount: recentOrders.length,
    },
  };
};
