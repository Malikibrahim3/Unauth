/**
 * lib/eval/runner.ts
 *
 * Runs the full scoring pipeline on a labelled CSV file.
 * Zero DB writes — all identity lookups are mocked out (DRY_RUN mode).
 * Cross-merchant signal is intentionally absent in this eval context.
 */

import { loadLabelledCsv } from './dataset';
import { scoreOrders } from '../engine';
import { computeEvalReport, computeMetrics } from './metrics';
import type { EvalReport, EvalMetrics } from './metrics';
import type { ScoredOrder, NormalisedOrder } from '../engine/types';

export interface EvalRunResult {
  scored: ScoredOrder[];
  labels: boolean[];
}

/**
 * Load a labelled CSV and score every row with the engine.
 * Makes zero database writes. Identity lookups are skipped (DRY_RUN=true),
 * so crossMerchant signal fires 0 times in eval — by design.
 *
 * @param filePath  Absolute or repo-relative path to a labelled CSV.
 */
export function runEval(filePath: string): EvalRunResult {
  const { orders, labels } = loadLabelledCsv(filePath);

  // scoreOrders is a pure in-memory function — no DB access.
  const scored = scoreOrders(orders);

  return { scored, labels };
}

/**
 * Load, score, and compute the full EvalReport in one call.
 */
export function runEvalWithReport(filePath: string): {
  report: EvalReport;
  scored: ScoredOrder[];
  labels: boolean[];
  orders: NormalisedOrder[];
} {
  const { scored, labels } = runEval(filePath);
  const report = computeEvalReport(scored, labels);
  return { report, scored, labels, orders: scored.map((s) => s.order) };
}

// =============================================================================
// LEGACY — kept for backward compatibility with existing engineEval.test.ts
// =============================================================================

export function evaluateRun(orders: NormalisedOrder[]): EvalMetrics | null {
  const hasLabels = orders.some((o) => o.groundTruthLabel != null);
  if (!hasLabels) return null;

  const scored = scoreOrders(orders);

  const predicted = scored.map((s) => s.flagged);
  const actual = scored.map((s) => s.order.groundTruthLabel);

  return computeMetrics(predicted, actual);
}
