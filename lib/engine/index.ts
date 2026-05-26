import type { NormalisedOrder, ScoredOrder, ScoringContext, SignalResult } from './types';
import type { CrossMerchantProfile, PendingAuditLog } from './fastContext';
import { SIGNAL_WEIGHTS, RISK_TIER_THRESHOLDS, FLAG_THRESHOLD, BROAD_OVERLAP_SIGNALS, STRONG_FRAUD_EVIDENCE_SIGNALS, STRONG_EVIDENCE_BY_SCORE, CONFIDENCE_THRESHOLDS, BEHAVIORAL_FRAUD_SIGNALS } from './weights';
import { mergeHistoryByCluster } from './identityHistory';
import type { LinkerResult } from '../linker';
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
  /** Linker output. When provided, histories are merged across identity clusters
   *  so behavioral signals see the full ring history, not per-email fragments. */
  linkerResult?: LinkerResult;
  /** Minimum linker confidence_score for history merging. Defaults to PROBABLE. */
  linkerConfidenceFloor?: number;
}

function buildContext(orders: NormalisedOrder[], opts?: ScoreOrdersOptions): ScoringContext {
  const baseHistory = new Map<string, NormalisedOrder[]>();
  for (const order of orders) {
    const arr = baseHistory.get(order.emailHash) ?? [];
    arr.push(order);
    baseHistory.set(order.emailHash, arr);
  }

  let customerOrderHistory = baseHistory;
  if (opts?.linkerResult) {
    const merged = mergeHistoryByCluster(
      orders,
      opts.linkerResult,
      opts.linkerConfidenceFloor ?? CONFIDENCE_THRESHOLDS.PROBABLE,
    );
    customerOrderHistory = merged.byEmailHash;
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
    if (BROAD_OVERLAP_SIGNALS.has(signal.name)) {
      hasBroadOverlap = true;
    }
    const scoreFloor = STRONG_EVIDENCE_BY_SCORE[signal.name];
    if (STRONG_FRAUD_EVIDENCE_SIGNALS.has(signal.name) || (scoreFloor !== undefined && signal.score >= scoreFloor)) {
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
    const customerOrders = context.customerOrderHistory.get(order.emailHash) ?? [];
    const lifetimeSpend = customerOrders.reduce((s, o) => s + o.orderTotal, 0);
    const cleanOrderCount = customerOrders.filter((o) => o.refundStatus === 'none' && o.chargebackDispute !== true).length;
    const firstSeenAt = customerOrders.reduce((m, o) => Math.min(m, o.orderDate.getTime()), order.orderDate.getTime());
    const tenureDays = Math.max(0, (order.orderDate.getTime() - firstSeenAt) / 86400000);
    const hasStrongDispute = signals.some((s) => s.fired && s.name === 'disputeHistory');
    const fairnessEligible = tenureDays >= 120 && customerOrders.length >= 20 && cleanOrderCount >= 15 && lifetimeSpend >= 1500;
    const adjustedScore = fairnessEligible && !hasStrongDispute ? totalScore * 0.82 : totalScore;
    const independentSignals = new Set(signals.filter((s) => s.fired && s.score >= 25).map((s) => s.name));
    let riskTier = getRiskTier(adjustedScore);
    if ((riskTier === 'high' || riskTier === 'critical') && !hasStrongDispute && independentSignals.size < 2) {
      riskTier = adjustedScore >= RISK_TIER_THRESHOLDS.medium ? 'medium' : 'low';
    }
    const baseFlagged = adjustedScore >= FLAG_THRESHOLD;

    // Composition gate — broad-overlap signals (shared infrastructure) cannot
    // flag an order on their own. At least one BEHAVIORAL_FRAUD_SIGNAL must fire.
    // See lib/engine/weights.ts BEHAVIORAL_FRAUD_SIGNALS for rationale.
    const hasBehavioralSignal = signals.some(
      (s) => s.fired && BEHAVIORAL_FRAUD_SIGNALS.has(s.name),
    );
    const flagged = baseFlagged && hasBehavioralSignal;

    return {
      order,
      totalScore: adjustedScore,
      riskTier,
      flagged,
      signals,
    };
  });
}
