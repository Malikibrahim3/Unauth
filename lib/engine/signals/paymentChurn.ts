import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

// Tight-window payment-method churn (§4). Mirrors lib/engine/fastScore.ts —
// see the comment there for rationale. 90d/≥4 was too lax and the dominant
// source of false positives; industry (Sift / Kount / Stripe Radar) uses days.
const WINDOWS: { label: string; ms: number; thresholds: { count: number; score: number }[] }[] = [
  { label: '24h', ms: 24 * 60 * 60 * 1000,     thresholds: [{ count: 3, score: 85 }, { count: 2, score: 65 }] },
  { label: '7d',  ms: 7 * 24 * 60 * 60 * 1000, thresholds: [{ count: 4, score: 70 }, { count: 3, score: 50 }] },
];

export const paymentChurn: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];
  if (customerOrders.length < 2) {
    return {
      name: 'paymentChurn',
      fired: false,
      score: 0,
      reason: 'Insufficient order history to evaluate payment-method churn.',
      evidence: {},
    };
  }

  const sorted = [...customerOrders].sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
  const buckets: Record<string, number> = {};
  let best = 0;
  let bestLabel: string | null = null;
  let bestCount = 0;

  for (const w of WINDOWS) {
    let maxDistinct = 0;
    let i = 0;
    const methodsInWindow = new Map<string, number>();
    for (let j = 0; j < sorted.length; j++) {
      const m = sorted[j].paymentMethod?.toLowerCase();
      if (m) methodsInWindow.set(m, (methodsInWindow.get(m) ?? 0) + 1);
      while (sorted[j].orderDate.getTime() - sorted[i].orderDate.getTime() > w.ms) {
        const om = sorted[i].paymentMethod?.toLowerCase();
        if (om) {
          const n = (methodsInWindow.get(om) ?? 0) - 1;
          if (n <= 0) methodsInWindow.delete(om);
          else methodsInWindow.set(om, n);
        }
        i++;
      }
      if (methodsInWindow.size > maxDistinct) maxDistinct = methodsInWindow.size;
    }
    buckets[w.label] = maxDistinct;
    for (const t of w.thresholds) {
      if (maxDistinct >= t.count && t.score > best) {
        best = t.score;
        bestLabel = w.label;
        bestCount = maxDistinct;
      }
    }
  }

  if (best === 0) {
    return {
      name: 'paymentChurn',
      fired: false,
      score: 0,
      reason: 'No tight-window payment-method churn detected.',
      evidence: { buckets, totalOrders: customerOrders.length },
    };
  }

  return {
    name: 'paymentChurn',
    fired: true,
    score: best,
    reason: `Customer used ${bestCount} distinct payment methods within a ${bestLabel} window — consistent with testing multiple stolen or compromised payment instruments.`,
    evidence: { buckets, triggeringWindow: bestLabel, triggeringCount: bestCount, totalOrders: customerOrders.length },
  };
};
