import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';
import { formatCurrency } from '@/lib/utils/format';

export const valueAnomaly: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];

  if (customerOrders.length < 5) {
    return {
      name: 'valueAnomaly',
      fired: false,
      score: 0,
      reason: 'Insufficient order history to detect value anomalies (need ≥5 orders).',
      evidence: { orderCount: customerOrders.length },
    };
  }

  const values = customerOrders.map((o: NormalisedOrder) => o.orderTotal);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance) || 1;

  const threshold = mean + 3 * stddev;

  if (order.orderTotal <= threshold) {
    return {
      name: 'valueAnomaly',
      fired: false,
      score: 0,
      reason: `Order value ${formatCurrency(order.orderTotal, order.currency)} is within the customer's normal range.`,
      evidence: { orderTotal: order.orderTotal, mean, stddev, threshold },
    };
  }

  const zscore = (order.orderTotal - mean) / stddev;

  return {
    name: 'valueAnomaly',
    fired: true,
    score: 40,
    reason: `Order value ${formatCurrency(order.orderTotal, order.currency)} is ${zscore.toFixed(1)} standard deviations above this customer's average order value of ${formatCurrency(mean, order.currency)}.`,
    evidence: {
      orderTotal: order.orderTotal,
      mean,
      stddev,
      zscore,
      threshold,
      orderCount: customerOrders.length,
    },
  };
};
