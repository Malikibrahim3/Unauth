#!/usr/bin/env ts-node
/**
 * scripts/calibrate-thresholds.ts
 *
 * Sweeps the global FLAG_THRESHOLD against a labelled CSV and reports the
 * F1-maximising threshold subject to a target precision floor (default 0.80).
 * Also reports per-signal precision/recall if that signal's fired flag alone
 * was used as the prediction — useful input when deciding which signal weights
 * to tune.
 *
 * Writes a JSON report. Does NOT auto-apply any change.
 *
 * Usage:
 *   npx ts-node scripts/calibrate-thresholds.ts test-data/realistic_fraud_dataset.csv
 *
 * Output:
 *   threshold-recommendations.json
 */

process.env.IDENTITY_SALT =
  process.env.IDENTITY_SALT || 'eval-salt-00000000000000000000000000000000000000000000000000000000000000000000';

import fs from 'node:fs';
import path from 'node:path';
import { loadLabelledCsv } from '../lib/eval/dataset';
import { scoreOrders } from '../lib/engine';
import type { ScoredOrder } from '../lib/engine/types';

interface ThresholdRow {
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

function evaluateAtThreshold(
  scored: ScoredOrder[],
  labels: boolean[],
  threshold: number
): ThresholdRow {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let i = 0; i < scored.length; i++) {
    const predicted = scored[i].totalScore >= threshold;
    const actual = labels[i];
    if (predicted && actual) tp++;
    else if (predicted && !actual) fp++;
    else if (!predicted && actual) fn++;
    else tn++;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { threshold, precision, recall, f1, tp, fp, fn, tn };
}

interface SignalSoloRow {
  signal: string;
  fires: number;
  precision: number;
  recall: number;
  f1: number;
}

function evaluateSignalsSolo(
  scored: ScoredOrder[],
  labels: boolean[]
): SignalSoloRow[] {
  const signalNames = new Set<string>();
  for (const s of scored) {
    for (const sig of s.signals) signalNames.add(sig.name);
  }

  const totalPositives = labels.filter(Boolean).length;

  const out: SignalSoloRow[] = [];
  for (const name of Array.from(signalNames)) {
    let tp = 0, fp = 0, fires = 0;
    for (let i = 0; i < scored.length; i++) {
      const fired = scored[i].signals.some((sig) => sig.name === name && sig.fired);
      if (!fired) continue;
      fires++;
      if (labels[i]) tp++; else fp++;
    }
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = totalPositives === 0 ? 0 : tp / totalPositives;
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    out.push({ signal: name, fires, precision, recall, f1 });
  }

  return out.sort((a, b) => b.f1 - a.f1);
}

async function main() {
  const datasetArg = process.argv[2];
  if (!datasetArg) {
    console.error('Usage: ts-node scripts/calibrate-thresholds.ts <path-to-labelled-csv>');
    process.exit(1);
  }

  const TARGET_PRECISION = parseFloat(process.env.TARGET_PRECISION || '0.80');
  const filePath = path.isAbsolute(datasetArg)
    ? datasetArg
    : path.join(process.cwd(), datasetArg);

  console.log(`Loading: ${filePath}`);
  const { orders, labels } = loadLabelledCsv(filePath);
  console.log(`Rows: ${orders.length}  positives: ${labels.filter(Boolean).length}`);

  console.log('Scoring once…');
  const scored = scoreOrders(orders);

  // Sweep FLAG_THRESHOLD across 5..95 in steps of 5.
  const sweep: ThresholdRow[] = [];
  for (let t = 5; t <= 95; t += 5) {
    sweep.push(evaluateAtThreshold(scored, labels, t));
  }

  // F1-maximising threshold subject to precision floor.
  const candidates = sweep.filter((r) => r.precision >= TARGET_PRECISION);
  const best = (candidates.length > 0 ? candidates : sweep)
    .reduce((a, b) => (b.f1 > a.f1 ? b : a));

  // Also compute the unconstrained F1 maximum.
  const unconstrainedBest = sweep.reduce((a, b) => (b.f1 > a.f1 ? b : a));

  const signalSolo = evaluateSignalsSolo(scored, labels);

  console.log('\n=== THRESHOLD SWEEP ===');
  console.log('threshold  precision  recall  f1     tp/fp/fn');
  for (const r of sweep) {
    console.log(
      `  ${String(r.threshold).padStart(2)}        ${r.precision.toFixed(3)}      ${r.recall.toFixed(3)}   ${r.f1.toFixed(3)}  ${r.tp}/${r.fp}/${r.fn}`
    );
  }
  console.log(`\nbest @ precision >= ${TARGET_PRECISION}:  threshold=${best.threshold}  f1=${best.f1.toFixed(3)}`);
  console.log(`best unconstrained:                threshold=${unconstrainedBest.threshold}  f1=${unconstrainedBest.f1.toFixed(3)}`);

  console.log('\n=== PER-SIGNAL SOLO PERFORMANCE ===');
  console.log('signal                fires   precision  recall  f1');
  for (const s of signalSolo) {
    console.log(
      `  ${s.signal.padEnd(20)}  ${String(s.fires).padStart(5)}   ${s.precision.toFixed(3)}      ${s.recall.toFixed(3)}   ${s.f1.toFixed(3)}`
    );
  }

  const report = {
    generated_at: new Date().toISOString(),
    dataset: datasetArg,
    rows: orders.length,
    positives: labels.filter(Boolean).length,
    target_precision: TARGET_PRECISION,
    recommendation: {
      flag_threshold: best.threshold,
      f1: best.f1,
      precision: best.precision,
      recall: best.recall,
    },
    unconstrained_best: {
      flag_threshold: unconstrainedBest.threshold,
      f1: unconstrainedBest.f1,
      precision: unconstrainedBest.precision,
      recall: unconstrainedBest.recall,
    },
    sweep,
    per_signal_solo: signalSolo,
  };

  const outPath = path.join(process.cwd(), 'threshold-recommendations.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log('Review before applying. Edit lib/engine/weights.ts to change FLAG_THRESHOLD.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
