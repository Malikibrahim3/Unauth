import type { NormalisedOrder, ScoredOrder } from './types';

export interface CustomerAggregate {
  emailHash: string;
  orderCount: number;
  refundCount: number;
  inrCount: number;
  totalSpend: number;
  avgOrderValue: number;
  refundRate: number;
  inrRate: number;
  maxScore: number;
  flaggedCount: number;
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  topSignals: string[];
}

export function aggregateCustomers(scoredOrders: ScoredOrder[]): CustomerAggregate[] {
  const byCustomer = new Map<string, ScoredOrder[]>();
  for (const s of scoredOrders) {
    const arr = byCustomer.get(s.order.emailHash) ?? [];
    arr.push(s);
    byCustomer.set(s.order.emailHash, arr);
  }

  const aggregates: CustomerAggregate[] = [];

  for (const [emailHash, orders] of Array.from(byCustomer.entries())) {
    const refundCount = orders.filter(
      (o) => o.order.refundStatus === 'full' || o.order.refundStatus === 'partial' || o.order.orderStatus === 'refunded'
    ).length;
    const inrCount = orders.filter((o) => o.order.refundReason === 'inr').length;
    const totalSpend = orders.reduce((sum, o) => sum + o.order.orderTotal, 0);
    const flaggedOrders = orders.filter((o) => o.flagged);
    const maxScore = Math.max(...orders.map((o) => o.totalScore));

    const signalCounts = new Map<string, number>();
    for (const order of orders) {
      for (const sig of order.signals.filter((s) => s.fired)) {
        signalCounts.set(sig.name, (signalCounts.get(sig.name) ?? 0) + 1);
      }
    }

    const topSignals = Array.from(signalCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    let riskTier: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (maxScore >= 75) riskTier = 'critical';
    else if (maxScore >= 50) riskTier = 'high';
    else if (maxScore >= 25) riskTier = 'medium';

    aggregates.push({
      emailHash,
      orderCount: orders.length,
      refundCount,
      inrCount,
      totalSpend,
      avgOrderValue: totalSpend / orders.length,
      refundRate: refundCount / orders.length,
      inrRate: inrCount / orders.length,
      maxScore,
      flaggedCount: flaggedOrders.length,
      riskTier,
      topSignals,
    });
  }

  return aggregates.sort((a, b) => b.maxScore - a.maxScore);
}
