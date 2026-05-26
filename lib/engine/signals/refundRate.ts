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

  const refundedOrders = customerOrders.filter(
    (o) => o.refundStatus === 'full' || o.refundStatus === 'partial' || o.orderStatus === 'refunded'
  );
  const refundedCount = refundedOrders.length;
  const customerRate = refundedCount / customerOrders.length;
  const lifetimeSpend = customerOrders.reduce((s, o) => s + o.orderTotal, 0);
  const totalRefundAmount = customerOrders.reduce((s, o) => s + (o.refundAmount ?? 0), 0);
  const refundedSpendRate = lifetimeSpend > 0 ? totalRefundAmount / lifetimeSpend : 0;
  const highValueThreshold = Math.max(120, order.orderTotal * 0.75);
  const highValueRefundAmount = refundedOrders.reduce((s, o) => s + ((o.refundAmount ?? 0) >= highValueThreshold ? (o.refundAmount ?? 0) : 0), 0);
  const highValueConcentration = totalRefundAmount > 0 ? highValueRefundAmount / totalRefundAmount : 0;
  const refundToOrderValue = order.orderTotal > 0 ? (order.refundAmount ?? 0) / order.orderTotal : 0;

  const { mean, stddev } = computePopulationStats(context.allOrders);
  const threshold = mean + 2 * stddev;

  if (customerRate <= threshold) return notFired;

  const zscore = (customerRate - mean) / stddev;
  const smoothedRate = (refundedCount + 1) / (customerOrders.length + 4);
  let score = Math.min(100, Math.round(zscore * 25));
  if (smoothedRate < threshold) score = Math.max(0, score - 15);
  if (refundedSpendRate > 0.3) score += 10;
  if (highValueConcentration > 0.65) score += 10;
  if (refundToOrderValue > 0.75) score += 5;
  score = Math.min(100, score);

  return {
    name: 'refundRate',
    fired: true,
    score,
    reason: `Refund frequency ${(customerRate * 100).toFixed(0)}% (${refundedCount}/${customerOrders.length}), refunded spend ${(refundedSpendRate * 100).toFixed(0)}% of lifetime spend, high-value concentration ${(highValueConcentration * 100).toFixed(0)}%.`,
    evidence: {
      customerRate,
      populationMean: mean,
      populationStddev: stddev,
      zscore,
      smoothedRate,
      refundedSpendRate,
      highValueConcentration,
      refundToOrderValue,
      lifetimeSpend,
      totalRefundAmount,
      highValueRefundAmount,
      orderCount: customerOrders.length,
      refundedCount,
    },
  };
};
