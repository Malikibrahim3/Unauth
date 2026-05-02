import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

function computePopulationStats(orders: NormalisedOrder[]): { mean: number; stddev: number } {
  const byCustomer = new Map<string, NormalisedOrder[]>();
  for (const o of orders) {
    const arr = byCustomer.get(o.emailHash) ?? [];
    arr.push(o);
    byCustomer.set(o.emailHash, arr);
  }

  const rates: number[] = [];
  for (const customerOrders of Array.from(byCustomer.values())) {
    if (customerOrders.length < 3) continue;
    const refunded = customerOrders.filter(
      (o: NormalisedOrder) => o.refundStatus === 'full' || o.refundStatus === 'partial' || o.orderStatus === 'refunded'
    ).length;
    rates.push(refunded / customerOrders.length);
  }

  if (rates.length === 0) return { mean: 0.1, stddev: 0.1 };

  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / rates.length;
  return { mean, stddev: Math.sqrt(variance) || 0.01 };
}

export const refundRate: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];

  const notFired: SignalResult = {
    name: 'refundRate',
    fired: false,
    score: 0,
    reason: 'Customer refund rate within population baseline.',
    evidence: {},
  };

  if (customerOrders.length < 3) return notFired;

  const refundedCount = customerOrders.filter(
    (o) => o.refundStatus === 'full' || o.refundStatus === 'partial' || o.orderStatus === 'refunded'
  ).length;
  const customerRate = refundedCount / customerOrders.length;

  const { mean, stddev } = computePopulationStats(context.allOrders);
  const threshold = mean + 2 * stddev;

  if (customerRate <= threshold) return notFired;

  const zscore = (customerRate - mean) / stddev;
  const score = Math.min(100, Math.round(zscore * 25));

  return {
    name: 'refundRate',
    fired: true,
    score,
    reason: `Customer refund rate is ${(customerRate * 100).toFixed(0)}% across ${customerOrders.length} orders, which is ${zscore.toFixed(1)} standard deviations above the population baseline of ${(mean * 100).toFixed(0)}%.`,
    evidence: {
      customerRate,
      populationMean: mean,
      populationStddev: stddev,
      zscore,
      orderCount: customerOrders.length,
      refundedCount,
    },
  };
};
