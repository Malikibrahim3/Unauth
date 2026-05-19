import type { NormalisedOrder, ScoredOrder, ScoringContext, SignalResult } from './types';
import type { CrossMerchantProfile, PendingAuditLog } from './fastContext';
import { SIGNAL_WEIGHTS, RISK_TIER_THRESHOLDS, FLAG_THRESHOLD } from './weights';
import { refundRate } from './signals/refundRate';
import { inrAbuse } from './signals/inrAbuse';
import { velocity } from './signals/velocity';
import { inrSpeed } from './signals/inrSpeed';
import { emailPattern } from './signals/emailPattern';
import { addressClustering } from './signals/addressClustering';
import { valueAnomaly } from './signals/valueAnomaly';
import { paymentChurn } from './signals/paymentChurn';
import { disputeHistory } from './signals/disputeHistory';
import { addressMismatch } from './signals/addressMismatch';
import { crossMerchant } from './signals/crossMerchantSignal';
import { refundPattern } from './signals/refundPattern';
import { billingAddressClustering } from './signals/billingAddressClustering';
import { networkDeviceLink } from './signals/networkDeviceLink';

const SIGNALS = [
  { fn: refundRate, key: 'refundRate' as const },
  { fn: inrAbuse, key: 'inrAbuse' as const },
  { fn: velocity, key: 'velocity' as const },
  { fn: inrSpeed, key: 'inrSpeed' as const },
  { fn: emailPattern, key: 'emailPattern' as const },
  { fn: addressClustering, key: 'addressClustering' as const },
  { fn: billingAddressClustering, key: 'billingAddressClustering' as const },
  { fn: valueAnomaly, key: 'valueAnomaly' as const },
  { fn: paymentChurn, key: 'paymentChurn' as const },
  { fn: disputeHistory, key: 'disputeHistory' as const },
  { fn: addressMismatch, key: 'addressMismatch' as const },
  { fn: crossMerchant, key: 'crossMerchant' as const },
  { fn: refundPattern, key: 'refundPattern' as const },
  { fn: networkDeviceLink, key: 'networkDeviceLink' as const },
];

export interface ScoreOrdersOptions {
  crossMerchantProfiles?: CrossMerchantProfile[];
  requestingMerchantId?: string;
  pendingAuditLogs?: PendingAuditLog[];
  networkFraudsterIdentifiers?: Set<string>;
}

function buildContext(orders: NormalisedOrder[], opts?: ScoreOrdersOptions): ScoringContext {
  const customerOrderHistory = new Map<string, NormalisedOrder[]>();
  for (const order of orders) {
    const arr = customerOrderHistory.get(order.emailHash) ?? [];
    arr.push(order);
    customerOrderHistory.set(order.emailHash, arr);
  }
  return {
    allOrders: orders,
    customerOrderHistory,
    crossMerchantProfiles: opts?.crossMerchantProfiles,
    requestingMerchantId: opts?.requestingMerchantId,
    pendingAuditLogs: opts?.pendingAuditLogs,
    networkFraudsterIdentifiers: opts?.networkFraudsterIdentifiers,
  };
}

function computeScore(signals: SignalResult[]): number {
  let weightedSum = 0;
  let totalWeight = 0;
  let hasBroadOverlap = false;
  let hasStrongFraudEvidence = false;

  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal.name as keyof typeof SIGNAL_WEIGHTS];
    if (weight === undefined) continue;
    if (!signal.fired) continue;
    if (['addressClustering', 'billingAddressClustering', 'emailPattern', 'crossMerchant', 'addressMismatch', 'networkDeviceLink'].includes(signal.name)) {
      hasBroadOverlap = true;
    }
    if (['refundRate', 'inrAbuse', 'inrSpeed', 'paymentChurn', 'refundPattern', 'disputeHistory', 'valueAnomaly', 'billingAddressClusteringActive', 'networkDeviceLinkActive'].includes(signal.name)) {
      hasStrongFraudEvidence = true;
    }
    weightedSum += signal.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  const rawScore = weightedSum / totalWeight;
  const corroboratedScore = hasBroadOverlap && !hasStrongFraudEvidence ? rawScore * 0.45 : rawScore;
  return Math.min(100, Math.max(0, corroboratedScore));
}

function getRiskTier(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= RISK_TIER_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_TIER_THRESHOLDS.high) return 'high';
  if (score >= RISK_TIER_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function scoreOrders(
  orders: NormalisedOrder[],
  opts?: ScoreOrdersOptions,
): ScoredOrder[] {
  const context: ScoringContext = buildContext(orders, opts);

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
