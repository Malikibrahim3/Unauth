import type { ScoredOrder } from '../engine/types';
import { FLAG_THRESHOLD } from '../engine/weights';

// =============================================================================
// EVAL REPORT — used by the CLI eval harness (scripts/eval.ts)
// =============================================================================

export interface EvalReport {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  /** Sum of order values for false-positive rows */
  falsePositiveCost: number;
  /** Per-signal: how many times it fired on a TP vs FP */
  perSignalContribution: Record<string, { tpFires: number; fpFires: number }>;
}

/**
 * Compute an EvalReport from a scored batch and boolean ground-truth labels.
 * A "positive" is any order with totalScore >= FLAG_THRESHOLD.
 * @param scored  ScoredOrder[] from the engine (same order as labels)
 * @param labels  boolean[] — true means the order is fraud per ground truth
 */
export function computeEvalReport(
  scored: ScoredOrder[],
  labels: boolean[]
): EvalReport {
  if (scored.length !== labels.length) {
    throw new Error('scored and labels arrays must be the same length');
  }

  let tp = 0, fp = 0, fn = 0, tn = 0;
  let falsePositiveCost = 0;

  const perSignal: Record<string, { tpFires: number; fpFires: number }> = {};

  for (let i = 0; i < scored.length; i++) {
    const s = scored[i];
    const predicted = s.totalScore >= FLAG_THRESHOLD;
    const actual = labels[i];

    if (predicted && actual) tp++;
    else if (predicted && !actual) {
      fp++;
      falsePositiveCost += s.order.orderTotal;
    }
    else if (!predicted && actual) fn++;
    else tn++;

    // Per-signal contribution
    for (const sig of s.signals) {
      if (!sig.fired) continue;
      if (!perSignal[sig.name]) perSignal[sig.name] = { tpFires: 0, fpFires: 0 };
      if (actual) perSignal[sig.name].tpFires++;
      else perSignal[sig.name].fpFires++;
    }
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    trueNegatives: tn,
    falsePositiveCost,
    perSignalContribution: perSignal,
  };
}

// =============================================================================
// LEGACY EVAL METRICS — kept for existing engineEval.test.ts compatibility
// =============================================================================

export interface EvalMetrics {
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  };
  flagRate: number;
  baseRate: number;
}

export function computeMetrics(
  predicted: boolean[],
  actual: ('fraud' | 'legitimate' | 'same_person' | 'different_people' | 'unknown' | null | undefined)[]
): EvalMetrics {
  if (predicted.length !== actual.length) {
    throw new Error('predicted and actual arrays must be the same length');
  }

  let tp = 0, fp = 0, tn = 0, fn = 0;
  let fraudCount = 0;
  let totalLabelled = 0;

  for (let i = 0; i < predicted.length; i++) {
    const label = actual[i];
    if (!label || label === 'unknown') continue;

    totalLabelled++;
    // Treat both legacy 'fraud' and new 'same_person' as positive class
    const isFraud = label === 'fraud' || label === 'same_person';
    const isFlagged = predicted[i];
    if (isFraud) fraudCount++;

    if (isFraud && isFlagged) tp++;
    else if (!isFraud && isFlagged) fp++;
    else if (!isFraud && !isFlagged) tn++;
    else fn++;
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const flagRate = predicted.filter(Boolean).length / predicted.length;
  const baseRate = totalLabelled > 0 ? fraudCount / totalLabelled : 0;

  return {
    precision,
    recall,
    f1,
    confusionMatrix: { truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn },
    flagRate,
    baseRate,
  };
}

// =============================================================================
// IDENTITY CLUSTERING METRICS
// =============================================================================

export type GroundTruthPairLabel = 'same_person' | 'different_people' | 'unknown';

export interface ClusterPair {
  orderIdA: string;
  orderIdB: string;
  groundTruth: GroundTruthPairLabel;
  predicted: 'same_person' | 'different_people';
}

export interface IdentityEvalMetrics {
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: {
    truePositives: number;   // same_person predicted, same_person ground truth
    falsePositives: number;  // same_person predicted, different_people ground truth
    trueNegatives: number;   // different_people predicted, different_people ground truth
    falseNegatives: number;  // different_people predicted, same_person ground truth
  };
  totalPairs: number;
  labelledPairs: number;
}

/**
 * Compute precision/recall/F1 for the identity clustering engine.
 *
 * Takes clustered order ID sets (from clusterBatch) and per-order ground truth
 * labels, generates all evaluated pairs, and computes metrics.
 *
 * @param clusterOrderIds - arrays of orderIds believed to be the same person
 * @param allOrderIds - all orderIds in the batch
 * @param groundTruthByOrderId - per-order ground truth label
 */
export function computeIdentityMetrics(
  clusterOrderIds: string[][],
  allOrderIds: string[],
  groundTruthByOrderId: Map<string, 'same_person' | 'different_people' | 'unknown' | null>
): IdentityEvalMetrics {
  // Build a map of orderId → clusterId
  const orderToCluster = new Map<string, string>();
  for (let i = 0; i < clusterOrderIds.length; i++) {
    for (const id of clusterOrderIds[i]) {
      orderToCluster.set(id, String(i));
    }
  }

  // Generate all unique pairs from the batch
  const pairs: ClusterPair[] = [];
  for (let i = 0; i < allOrderIds.length; i++) {
    for (let j = i + 1; j < allOrderIds.length; j++) {
      const idA = allOrderIds[i];
      const idB = allOrderIds[j];

      const labelA = groundTruthByOrderId.get(idA);
      const labelB = groundTruthByOrderId.get(idB);

      // Determine ground truth for the pair
      let groundTruth: GroundTruthPairLabel = 'unknown';
      if (labelA === 'same_person' && labelB === 'same_person') {
        groundTruth = 'same_person';
      } else if (labelA === 'different_people' && labelB === 'different_people') {
        groundTruth = 'different_people';
      } else if (
        (labelA === 'same_person' && labelB === 'different_people') ||
        (labelA === 'different_people' && labelB === 'same_person')
      ) {
        groundTruth = 'unknown'; // ambiguous — exclude from metrics
      }

      // Predicted label: same_person if in same cluster, different_people otherwise
      const clusterA = orderToCluster.get(idA);
      const clusterB = orderToCluster.get(idB);
      const predicted =
        clusterA != null && clusterB != null && clusterA === clusterB
          ? 'same_person'
          : 'different_people';

      pairs.push({ orderIdA: idA, orderIdB: idB, groundTruth, predicted });
    }
  }

  const labelledPairs = pairs.filter((p) => p.groundTruth !== 'unknown');

  const tp = labelledPairs.filter(
    (p) => p.groundTruth === 'same_person' && p.predicted === 'same_person'
  ).length;
  const fp = labelledPairs.filter(
    (p) => p.groundTruth === 'different_people' && p.predicted === 'same_person'
  ).length;
  const tn = labelledPairs.filter(
    (p) => p.groundTruth === 'different_people' && p.predicted === 'different_people'
  ).length;
  const fn = labelledPairs.filter(
    (p) => p.groundTruth === 'same_person' && p.predicted === 'different_people'
  ).length;

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    confusionMatrix: {
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn,
    },
    totalPairs: pairs.length,
    labelledPairs: labelledPairs.length,
  };
}

