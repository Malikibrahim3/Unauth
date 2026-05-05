import type { Signal, SignalResult, ScoringContext, NormalisedOrder } from '../types';

// Multi-bucket velocity (§3). Mirrors lib/engine/fastScore.ts#velocity — any
// change to scoring thresholds must be applied to both files so the eval
// harness and the production pipeline score identically.
const WINDOWS: { label: '1h' | '24h' | '7d'; ms: number; thresholds: { count: number; score: number }[] }[] = [
  { label: '1h',  ms: 60 * 60 * 1000,          thresholds: [{ count: 3, score: 90 }, { count: 2, score: 70 }] },
  { label: '24h', ms: 24 * 60 * 60 * 1000,     thresholds: [{ count: 5, score: 75 }, { count: 3, score: 50 }] },
  { label: '7d',  ms: 7 * 24 * 60 * 60 * 1000, thresholds: [{ count: 15, score: 55 }, { count: 8, score: 35 }] },
];

function maxInWindow(sortedTimes: number[], ms: number): number {
  let maxCount = 0;
  let i = 0;
  for (let j = 0; j < sortedTimes.length; j++) {
    while (sortedTimes[j] - sortedTimes[i] > ms) i++;
    const c = j - i + 1;
    if (c > maxCount) maxCount = c;
  }
  return maxCount;
}

export const velocity: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];
  if (customerOrders.length < 2) {
    return { name: 'velocity', fired: false, score: 0, reason: 'Insufficient order history to evaluate velocity.', evidence: {} };
  }

  const times = customerOrders.map((o) => o.orderDate.getTime()).sort((a, b) => a - b);

  const buckets: Record<string, number> = {};
  let best = 0;
  let bestLabel: string | null = null;
  let bestCount = 0;
  for (const w of WINDOWS) {
    const m = maxInWindow(times, w.ms);
    buckets[w.label] = m;
    for (const t of w.thresholds) {
      if (m >= t.count && t.score > best) {
        best = t.score;
        bestLabel = w.label;
        bestCount = m;
      }
    }
  }

  if (best === 0) {
    return {
      name: 'velocity',
      fired: false,
      score: 0,
      reason: 'No burst ordering detected across 1h / 24h / 7d windows.',
      evidence: { buckets, totalOrders: customerOrders.length },
    };
  }

  return {
    name: 'velocity',
    fired: true,
    score: best,
    reason: `Customer placed ${bestCount} orders within a ${bestLabel} window (1h=${buckets['1h']}, 24h=${buckets['24h']}, 7d=${buckets['7d']}).`,
    evidence: { buckets, triggeringWindow: bestLabel, triggeringCount: bestCount, totalOrders: customerOrders.length },
  };
};
