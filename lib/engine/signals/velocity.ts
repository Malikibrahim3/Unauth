import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export const velocity: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];

  if (customerOrders.length < 3) {
    return {
      name: 'velocity',
      fired: false,
      score: 0,
      reason: 'Insufficient order history to evaluate velocity.',
      evidence: {},
    };
  }

  const sorted = [...customerOrders].sort(
    (a, b) => a.orderDate.getTime() - b.orderDate.getTime()
  );

  let maxWindow = 0;
  for (let i = 0; i < sorted.length; i++) {
    let count = 1;
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].orderDate.getTime() - sorted[i].orderDate.getTime() <= WINDOW_MS) {
        count++;
      } else {
        break;
      }
    }
    if (count > maxWindow) maxWindow = count;
  }

  if (maxWindow < 3) {
    return {
      name: 'velocity',
      fired: false,
      score: 0,
      reason: 'No burst ordering detected.',
      evidence: { maxOrdersIn24h: maxWindow },
    };
  }

  const score = Math.min(90, 50 + 10 * (maxWindow - 3));

  return {
    name: 'velocity',
    fired: true,
    score,
    reason: `Customer placed ${maxWindow} orders within a 24-hour window.`,
    evidence: {
      maxOrdersIn24h: maxWindow,
      totalOrders: customerOrders.length,
    },
  };
};
