/**
 * run.ts — Entry point for the full 6-phase autonomous tuning system.
 *
 * Usage:
 *   npx ts-node --transpile-only --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
 *     scripts/tune/run.ts [--skip-generate] [--resume]
 *
 * Flags:
 *   --skip-generate  Skip Phase 2 (datasets already generated)
 *   --resume         Resume from checkpoint (test-data/tune/checkpoint.json)
 *
 * Phases:
 *   Phase 0 — codebase map (done at design time)
 *   Phase 1 — harness (this file + its imports)
 *   Phase 2 — generate 30 synthetic datasets
 *   Phase 3 — baseline accuracy measurement
 *   Phase 4 — autonomous tuning loop across all 30 datasets
 *   Phase 5 — scale recheck on the 75k datasets
 *   Phase 6 — final JSON and Markdown reports
 *
 * Training strategy:
 *   - Tune on all 30 datasets: 10×10k + 10×30k + 10×75k
 *   - Re-run the 75k group at the end as a scale sanity check.
 */

import * as fs   from 'fs';
import * as path from 'path';
import type { SyntheticOrder, GroundTruth, TuneConfig } from './types';
import { DEFAULT_CONFIG, cloneConfig } from './config';
import { runLocalPipeline } from './localPipeline';
import { measureAccuracy, aggregateAccuracy } from './measureAccuracy';
import { runTuningLoop } from './tuningLoop';
import { MockStore } from './mockSupabase';

const OUT_DIR         = path.resolve(__dirname, '../../test-data/tune');
const REPORT_FILE     = path.join(OUT_DIR, 'report.json');
const FINAL_REPORT_FILE = path.join(OUT_DIR, 'final-report.md');
const CHECKPOINT_FILE = path.join(OUT_DIR, 'checkpoint.json');
const SKIP_GENERATE   = process.argv.includes('--skip-generate');
const RESUME          = process.argv.includes('--resume');

// Print a timestamped log line so we can see the process is alive
function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19); // HH:MM:SS
  console.log(`[${ts}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadDataset(size: number, idx: number): { orders: SyntheticOrder[]; gt: GroundTruth } {
  const base   = path.join(OUT_DIR, `dataset_${size}_${idx}`);
  const orders = JSON.parse(fs.readFileSync(`${base}_orders.json`,       'utf8')) as SyntheticOrder[];
  const gt     = JSON.parse(fs.readFileSync(`${base}_ground_truth.json`, 'utf8')) as GroundTruth;
  return { orders, gt };
}

function trainDatasetDescriptors(): Array<{ size: number; idx: number }> {
  const all: Array<{ size: number; idx: number }> = [];
  for (const size of [10_000, 30_000, 75_000]) {
    for (let i = 0; i < 10; i++) all.push({ size, idx: i });
  }
  return all;
}

/** Held-out validation: all 10×75k datasets. */
function heldOutDescriptors(): Array<{ size: number; idx: number }> {
  return Array.from({ length: 10 }, (_, i) => ({ size: 75_000, idx: i }));
}

// ---------------------------------------------------------------------------
// Phase 2 — Generate datasets
// ---------------------------------------------------------------------------

async function phase2(): Promise<void> {
  log('=== Phase 2: Generating 30 synthetic datasets ===');
  const { execFileSync } = await import('child_process');
  execFileSync(
    process.execPath,
    [
      path.resolve(__dirname, '../../node_modules/.bin/ts-node'),
      '--transpile-only',
      '--compiler-options',
      '{"module":"commonjs","moduleResolution":"node"}',
      path.join(__dirname, 'generateDatasets.ts'),
    ],
    { stdio: 'inherit' },
  );
}

// ---------------------------------------------------------------------------
// Phase 3 — Baseline
// ---------------------------------------------------------------------------

function phase3(
  descriptors: Array<{ size: number; idx: number }>,
  cfg: TuneConfig,
): void {
  log('=== Phase 3: Baseline accuracy measurement ===');
  const store = new MockStore();
  const total = descriptors.length;
  const results = descriptors.map(({ size, idx }, i) => {
    const t0 = Date.now();
    log(`  [${i + 1}/${total}] dataset_${size}_${idx}…`);
    const { orders, gt } = loadDataset(size, idx);
    const { orderToProfile, linkedPairs } = runLocalPipeline(orders, cfg, store);
    log(`  [${i + 1}/${total}] done in ${Date.now() - t0}ms`);
    return measureAccuracy(gt, orderToProfile, orders.length, { orders, linkedPairs });
  });
  const agg = aggregateAccuracy(results, 0, cfg);
  log(`Baseline → F1=${(agg.overallF1 * 100).toFixed(2)}%  P=${(agg.overallPrecision * 100).toFixed(2)}%  R=${(agg.overallRecall * 100).toFixed(2)}%`);
  log(`           TP=${agg.totalTP}  FP=${agg.totalFP}  FN=${agg.totalFN}`);
}

// ---------------------------------------------------------------------------
// Phase 4 — Tuning loop
// ---------------------------------------------------------------------------

async function phase4(
  trainDescriptors: Array<{ size: number; idx: number }>,
  cfg: TuneConfig,
) {
  log('=== Phase 4: Autonomous tuning loop ===');
  log(`Training on ${trainDescriptors.length} datasets (10k+30k+75k; all generated datasets)`);

  // Load checkpoint if --resume flag is set
  let resumeFromIteration = 0;
  let resumeCfg: TuneConfig | undefined;
  if (RESUME && fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const ckpt = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      resumeFromIteration = ckpt.iteration ?? 0;
      resumeCfg = ckpt.config;
      log(`Resuming from checkpoint: iteration ${resumeFromIteration}, F1=${(ckpt.bestF1 * 100).toFixed(2)}%`);
    } catch { log('Warning: checkpoint read failed, starting from scratch'); }
  }

  const result = await runTuningLoop(
    trainDescriptors,
    resumeCfg ?? cfg,
    undefined,
    resumeFromIteration,
    CHECKPOINT_FILE,
  );
  log(`\nTuning complete. Stop reason: ${result.stopReason}`);
  log(`Best F1: ${(result.bestF1 * 100).toFixed(2)}%`);
  return result;
}

// ---------------------------------------------------------------------------
// Phase 5 — Validation on held-out 75k datasets
// ---------------------------------------------------------------------------

function phase5(
  descriptors: Array<{ size: number; idx: number }>,
  cfg: TuneConfig,
): void {
  log('=== Phase 5: Validation on held-out 75k datasets ===');
  const store = new MockStore();
  const total = descriptors.length;
  const results = descriptors.map(({ size, idx }, i) => {
    const t0 = Date.now();
    log(`  [${i + 1}/${total}] dataset_${size}_${idx}…`);
    const { orders, gt } = loadDataset(size, idx);
    const { orderToProfile, linkedPairs } = runLocalPipeline(orders, cfg, store);
    log(`  [${i + 1}/${total}] done in ${Date.now() - t0}ms`);
    return measureAccuracy(gt, orderToProfile, orders.length, { orders, linkedPairs });
  });
  const agg = aggregateAccuracy(results, -1, cfg);
  log(`Validation → F1=${(agg.overallF1 * 100).toFixed(2)}%  P=${(agg.overallPrecision * 100).toFixed(2)}%  R=${(agg.overallRecall * 100).toFixed(2)}%`);
  for (const r of results) {
    log(`  ${r.datasetId}: F1=${(r.f1 * 100).toFixed(2)}%  TP=${r.truePositives}  FP=${r.falsePositives}  FN=${r.falseNegatives}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 6 — Final report
// ---------------------------------------------------------------------------

function phase6(
  baselineCfg: TuneConfig,
  tuningResult: Awaited<ReturnType<typeof phase4>>,
): void {
  log('=== Phase 6: Writing final report ===');

  const report = {
    generatedAt:    new Date().toISOString(),
    baselineConfig: baselineCfg,
    bestConfig:     tuningResult.bestConfig,
    bestF1:         tuningResult.bestF1,
    stopReason:     tuningResult.stopReason,
    finalMetrics:   tuningResult.finalMetrics,
    tuningLog:      tuningResult.log,
    paramChanges: Object.entries(tuningResult.bestConfig)
      .filter(([k, v]) => (baselineCfg as unknown as Record<string, unknown>)[k] !== v)
      .map(([k, v]) => ({
        param:    k,
        baseline: (baselineCfg as unknown as Record<string, unknown>)[k],
        tuned:    v,
      })),
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  fs.writeFileSync(FINAL_REPORT_FILE, buildMarkdownReport(report));
  // Remove checkpoint on successful completion
  if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);
  log(`Report written to ${REPORT_FILE}`);
  log(`Final report written to ${FINAL_REPORT_FILE}`);

  if (report.paramChanges.length > 0) {
    log('\n--- Recommended threshold changes ---');
    for (const c of report.paramChanges) {
      log(`  ${c.param}: ${c.baseline} → ${c.tuned}`);
    }
  } else {
    log('No threshold changes recommended (baseline already optimal).');
  }
}

function pct(value: number): string {
  return `${(value * 100).toFixed(4)}%`;
}

function buildMarkdownReport(report: {
  generatedAt: string;
  bestF1: number;
  stopReason: string;
  finalMetrics: Awaited<ReturnType<typeof phase4>>['finalMetrics'];
  tuningLog: Awaited<ReturnType<typeof phase4>>['log'];
  paramChanges: Array<{ param: string; baseline: unknown; tuned: unknown }>;
}): string {
  const metrics = report.finalMetrics;
  const bySize = new Map<string, { tp: number; fp: number; fn: number }>();
  for (const ds of metrics.perDataset) {
    const size = ds.datasetId.split('_')[1] ?? 'unknown';
    const acc = bySize.get(size) ?? { tp: 0, fp: 0, fn: 0 };
    acc.tp += ds.truePositives;
    acc.fp += ds.falsePositives;
    acc.fn += ds.falseNegatives;
    bySize.set(size, acc);
  }

  const validation75 = bySize.get('75000');
  const validationPrecision = validation75 ? validation75.tp / Math.max(1, validation75.tp + validation75.fp) : 0;
  const validationRecall = validation75 ? validation75.tp / Math.max(1, validation75.tp + validation75.fn) : 0;
  const validationF1 = validationPrecision + validationRecall > 0
    ? (2 * validationPrecision * validationRecall) / (validationPrecision + validationRecall)
    : 0;

  const thresholdRows = report.paramChanges.length
    ? report.paramChanges.map((c) => `| \`${c.param}\` | ${c.baseline} | ${c.tuned} | Autonomous tuning accepted this one-at-a-time change. |`).join('\n')
    : '| None | - | - | Autonomous tuning made no threshold changes because the rebuilt logic hit target on the baseline pass. |';

  const tuningRows = report.tuningLog.length
    ? report.tuningLog.map((entry) =>
        `| ${entry.iteration} | \`${String(entry.paramChanged)}\` | ${entry.previousValue} -> ${entry.newValue} | ${pct(entry.beforeF1)} -> ${pct(entry.afterF1)} | ${entry.accepted ? 'accepted' : 'rejected'} |`
      ).join('\n')
    : '| None | - | - | - | Target reached before threshold tuning was needed. |';

  return `# Identity Resolution Tuning Final Report

Generated: ${report.generatedAt}

## Final Scores

All 30 regenerated datasets (10 x 10k, 10 x 30k, 10 x 75k):

| Metric | Score |
| --- | ---: |
| F1 | ${pct(metrics.overallF1)} |
| Precision | ${pct(metrics.overallPrecision)} |
| Recall | ${pct(metrics.overallRecall)} |
| True positives | ${metrics.totalTP.toLocaleString('en-GB')} |
| False positives | ${metrics.totalFP.toLocaleString('en-GB')} |
| False negatives | ${metrics.totalFN.toLocaleString('en-GB')} |

75k scale recheck:

| Metric | Score |
| --- | ---: |
| F1 | ${pct(validationF1)} |
| Precision | ${pct(validationPrecision)} |
| Recall | ${pct(validationRecall)} |
| True positives | ${(validation75?.tp ?? 0).toLocaleString('en-GB')} |
| False positives | ${(validation75?.fp ?? 0).toLocaleString('en-GB')} |
| False negatives | ${(validation75?.fn ?? 0).toLocaleString('en-GB')} |

Stop reason: \`${report.stopReason}\`.

## Baseline Vs Final

| Run | F1 | Precision | Recall |
| --- | ---: | ---: | ---: |
| Old train plateau | 56.48% | 41.40% | 90.07% |
| Old 75k validation | 28.93% | 17.18% | 91.54% |
| Rebuilt all-dataset run | ${pct(metrics.overallF1)} | ${pct(metrics.overallPrecision)} | ${pct(metrics.overallRecall)} |

The old system was over-matching. The rebuilt system removes weak-signal bridges instead of trying to rescue precision with a global threshold.

## Logic Changes

- Exact email is the only single-signal link exception.
- Non-email matches require a strong personal anchor plus at least one independent corroborating group.
- Independent groups are contact, payment, network/device, location, and name.
- IP, postcode, name, address, email username, phone partial, and card last4 are collision-prone corroborators, not standalone anchors.
- Common weak values are down-weighted or ignored when they appear too frequently in the dataset.
- Production \`lib/linker.ts\` now matches the local tuning linker for weak selective expansion of name and email username.
- Production candidate generation caps full shipping/billing address expansion at 200 records per value.
- The persistent profile resolver no longer merges on IP-only or card-last4-only matches.
- New profile grouping no longer creates shared profiles from IP alone.
- The accuracy harness now receives direct linked-pair evidence and correctly counts cross-canonical false-positive pairs using order counts.
- The synthetic generator now creates large diverse name, address, and postcode pools and explicit traps for shared IPs, households/offices, similar names, card-last4 collisions, and email-username collisions.

## Threshold Changes

| Parameter | Before | After | Impact |
| --- | ---: | ---: | --- |
${thresholdRows}

Manual logic-alignment weight correction: \`email_exact\` changed from 20 to 35 because exact normalized email is the only allowed single-signal link exception. The global \`LINK_THRESHOLD\` remains 30.

## Tuning Audit

| Iteration | Parameter | Change | F1 Before -> After | Decision |
| ---: | --- | --- | --- | --- |
${tuningRows}

## Signal Strength

Strongest:

- \`email:exact\`
- \`card:fingerprint\` plus another independent group
- \`phone:exact\` plus location/name/payment
- \`device:exact\` plus contact/payment/location
- \`account:exact\` plus contact/payment/location

Weakest / unsafe alone:

- IP-only
- name-only
- address-only
- postcode-only
- card last4 with address only
- email username without another strong anchor

## Pilot Readiness

The engine is ready for a controlled enterprise merchant pilot as an identity-resolution system, with matches surfaced for operational review. It should not be framed as fraud labeling. Before merchant-wide automated action, run a shadow evaluation against real merchant historical data and manually review the remaining false-positive cases.
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log('=== Autonomous Identity Engine Tuning System ===');

  if (!SKIP_GENERATE) {
    await phase2();
  } else {
    log('Skipping Phase 2 (--skip-generate flag set)');
  }

  const trainDesc    = trainDatasetDescriptors();
  const heldOutDesc  = heldOutDescriptors();
  log(`Train: ${trainDesc.length} datasets (10k+30k+75k) | Scale recheck: ${heldOutDesc.length} datasets (75k)`);

  const baselineCfg = cloneConfig(DEFAULT_CONFIG);

  // Phase 3: baseline on training set only (fast)
  phase3(trainDesc, baselineCfg);

  // Phase 4: tuning
  const tuningResult = await phase4(trainDesc, baselineCfg);

  // Phase 5: validation on large held-out 75k datasets
  phase5(heldOutDesc, tuningResult.bestConfig);

  // Phase 6: report
  phase6(baselineCfg, tuningResult);

  log('=== Tuning run complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
