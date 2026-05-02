import type { NormalisedOrder, ScoredOrder, ScoringContext, SignalResult } from './types';
import { SIGNAL_WEIGHTS, RISK_TIER_THRESHOLDS, FLAG_THRESHOLD } from './weights';
import { refundRate } from './signals/refundRate';
import { inrAbuse } from './signals/inrAbuse';
import { velocity } from './signals/velocity';
import { inrSpeed } from './signals/inrSpeed';
import { emailPattern } from './signals/emailPattern';
import { addressClustering } from './signals/addressClustering';
import { valueAnomaly } from './signals/valueAnomaly';
import { paymentChurn } from './signals/paymentChurn';

const SIGNALS = [
  { fn: refundRate, key: 'refundRate' as const },
  { fn: inrAbuse, key: 'inrAbuse' as const },
  { fn: velocity, key: 'velocity' as const },
  { fn: inrSpeed, key: 'inrSpeed' as const },
  { fn: emailPattern, key: 'emailPattern' as const },
  { fn: addressClustering, key: 'addressClustering' as const },
  { fn: valueAnomaly, key: 'valueAnomaly' as const },
  { fn: paymentChurn, key: 'paymentChurn' as const },
];

function buildContext(orders: NormalisedOrder[]): ScoringContext {
  const customerOrderHistory = new Map<string, NormalisedOrder[]>();
  for (const order of orders) {
    const arr = customerOrderHistory.get(order.emailHash) ?? [];
    arr.push(order);
    customerOrderHistory.set(order.emailHash, arr);
  }
  return { allOrders: orders, customerOrderHistory };
}

function computeScore(signals: SignalResult[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal.name as keyof typeof SIGNAL_WEIGHTS];
    if (weight === undefined) continue;
    weightedSum += signal.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.min(100, Math.max(0, weightedSum / totalWeight));
}

function getRiskTier(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= RISK_TIER_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_TIER_THRESHOLDS.high) return 'high';
  if (score >= RISK_TIER_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function scoreOrders(
  orders: NormalisedOrder[]
): ScoredOrder[] {
  const context: ScoringContext = buildContext(orders);

  return orders.map((order) => {
    const signals = SIGNALS.map(({ fn }) => fn(order, context));
    const totalScore = computeScore(signals);
    const riskTier = getRiskTier(totalScore);
    const flagged = totalScore >= FLAG_THRESHOLD;

    return {
      order,
      totalScore,
      riskTier,
      flagged,
      signals,
    };
  });
}
