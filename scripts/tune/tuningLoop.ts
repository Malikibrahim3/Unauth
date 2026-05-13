/**
 * tuningLoop.ts — Phase 4
 *
 * Autonomous tuning loop.
 *
 * Strategy:
 *   1. Run all 30 datasets with current config → compute aggregate F1
 *   2. If F1 ≥ 97% (TARGET_F1) → done
 *   3. If plateau detected (8 consecutive non-improving iterations) → done
 *   4. Otherwise, analyse the dominant failure mode and perturb the parameter
 *      most likely to fix it, then go to step 1.
 *
 * Perturbation rules:
 *   - If FP dominates → raise LINK_THRESHOLD (harder to link)
 *   - If FN dominates → lower LINK_THRESHOLD (easier to link)
 *   - Then drill into which signal tier is responsible and adjust its weight
 *
 * Only one parameter is changed per iteration (gradient-free hillclimb).
 */

import type {
  TuneConfig,
  AggregateAccuracy,
  TuningLogEntry,
  SyntheticOrder,
  GroundTruth,
} from './types';
import { cloneConfig } from './config';
import { runLocalPipeline } from './localPipeline';
import { measureAccuracy, aggregateAccuracy } from './measureAccuracy';
import { MockStore } from './mockSupabase';

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../test-data/tune');

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function loadDataset(size: number, idx: number): { orders: SyntheticOrder[]; gt: GroundTruth } {
  const base   = path.join(DATA_DIR, `dataset_${size}_${idx}`);
  const orders = JSON.parse(fs.readFileSync(`${base}_orders.json`,       'utf8')) as SyntheticOrder[];
  const gt     = JSON.parse(fs.readFileSync(`${base}_ground_truth.json`, 'utf8')) as GroundTruth;
  return { orders, gt };
}

export interface TuningResult {
  bestConfig:   TuneConfig;
  bestF1:       number;
  log:          TuningLogEntry[];
  finalMetrics: AggregateAccuracy;
  stopReason:   'target_reached' | 'plateau' | 'max_iterations';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_F1         = 0.90;
const TARGET_PRECISION  = 0.85;
const TARGET_RECALL     = 0.90;
const MIN_ACCEPT_RECALL = 0.85;
const PLATEAU_WINDOW    = 8;
const MAX_ITERATIONS    = 120;
// Perturbation step sizes for each parameter class
const THRESHOLD_STEP    = 2;
const SIGNAL_WEIGHT_STEP = 3;

// ---------------------------------------------------------------------------
// Dominant failure mode
// ---------------------------------------------------------------------------

function dominantMode(agg: AggregateAccuracy): 'fp' | 'fn' | 'balanced' {
  const fpRate = agg.totalFP / Math.max(1, agg.totalTP + agg.totalFP);
  const fnRate = agg.totalFN / Math.max(1, agg.totalTP + agg.totalFN);
  if (fpRate > fnRate * 1.5) return 'fp';
  if (fnRate > fpRate * 1.5) return 'fn';
  return 'balanced';
}

// ---------------------------------------------------------------------------
// Which signal weight to tune based on failure details
// ---------------------------------------------------------------------------

type TunableWeight = Exclude<keyof TuneConfig, 'LINK_THRESHOLD' | 'POSSIBLE_THRESHOLD' | 'ER_IP_RISK_GATE' | 'ER_CONF_EMAIL' | 'ER_CONF_CARD' | 'ER_CONF_IP_ADDR' | 'ER_CONF_IP_ONLY'>;

const SIGNAL_PARAM_MAP: Record<string, TunableWeight> = {
  email_exact:        'email_exact',
  email_variant:      'email_username',
  card_fingerprint:   'card_fingerprint',
  card_full:          'card_full',
  card_last4:         'card_last4',
  phone_exact:        'phone_exact',
  phone_partial:      'phone_partial',
  device_exact:       'device_exact',
  account_exact:      'account_exact',
  address_exact:      'shipping_exact',
  address_partial:    'shipping_partial',
  ip_exact:           'ip_exact',
  ip_subnet:          'ip_subnet',
  name_fuzzy:         'name_fuzzy',
  name_exact:         'name_exact',
};

function pickParamToTune(
  mode: 'fp' | 'fn' | 'balanced',
  agg: AggregateAccuracy,
  cfg: TuneConfig,
  iteration: number,
  rejectedChanges: Set<string>,
): { param: keyof TuneConfig; direction: 1 | -1; reasoning: string } {
  const candidates: Array<{ param: keyof TuneConfig; direction: 1 | -1; reasoning: string }> = [];

  if (mode === 'fp') {
    const signalFpCount = new Map<string, number>();
    for (const ds of agg.perDataset) {
      for (const detail of ds.fpDetails) {
        if (detail.confusingSignal) {
          signalFpCount.set(detail.confusingSignal, (signalFpCount.get(detail.confusingSignal) ?? 0) + 1);
        }
      }
    }

    const rankedSignals = Array.from(signalFpCount.entries()).sort((a, b) => b[1] - a[1]);
    for (const [sig, count] of rankedSignals) {
      const param = SIGNAL_PARAM_MAP[sig];
      if (param && cfg[param] > 1) {
        candidates.push({
          param,
          direction: -1,
          reasoning: `Reducing ${param} to cut FP merges associated with ${sig} (${count} examples)`,
        });
      }
    }

    const fpSignalCycle: TunableWeight[] = [
      'shipping_exact', 'billing_exact', 'name_exact', 'card_last4',
      'email_username', 'phone_partial', 'postcode_full', 'ip_exact',
      'shipping_partial', 'billing_partial', 'postcode_outward', 'ip_subnet',
    ];
    for (let offset = 0; offset < fpSignalCycle.length; offset++) {
      const param = fpSignalCycle[(iteration + offset) % fpSignalCycle.length];
      if (cfg[param] > 1) {
        candidates.push({
          param,
          direction: -1,
          reasoning: `FP-dominant fallback: reducing ${param} and measuring impact`,
        });
      }
    }

    candidates.push({ param: 'LINK_THRESHOLD', direction: 1, reasoning: 'FP-dominant fallback: raising LINK_THRESHOLD' });
  }

  if (mode === 'fn') {
    const signalFnCount = new Map<string, number>();
    for (const ds of agg.perDataset) {
      for (const detail of ds.fnDetails) {
        for (const sig of detail.missedSignals ?? []) {
          signalFnCount.set(sig, (signalFnCount.get(sig) ?? 0) + 1);
        }
      }
    }

    const rankedSignals = Array.from(signalFnCount.entries()).sort((a, b) => b[1] - a[1]);
    for (const [sig, count] of rankedSignals) {
      const param = SIGNAL_PARAM_MAP[sig];
      if (param && cfg[param] < 40) {
        candidates.push({
          param,
          direction: 1,
          reasoning: `Raising ${param} to recover FN pairs with available ${sig} (${count} examples)`,
        });
      }
    }

    candidates.push({ param: 'LINK_THRESHOLD', direction: -1, reasoning: 'FN-dominant fallback: lowering LINK_THRESHOLD' });
  }

  const cyclicParams: TunableWeight[] = [
    'email_exact', 'card_fingerprint', 'phone_exact', 'device_exact',
    'account_exact', 'shipping_exact', 'billing_exact', 'card_full',
    'name_exact', 'ip_exact', 'postcode_full', 'card_last4',
  ];
  for (let offset = 0; offset < cyclicParams.length; offset++) {
    const param = cyclicParams[(iteration + offset) % cyclicParams.length];
    const direction = mode === 'fn' ? 1 : -1;
    candidates.push({ param, direction, reasoning: `Systematic one-at-a-time tuning of ${param}` });
  }

  candidates.push({ param: 'LINK_THRESHOLD', direction: mode === 'fn' ? -1 : 1, reasoning: 'Last-resort global threshold adjustment' });

  for (const candidate of candidates) {
    const prevValue = cfg[candidate.param] as number;
    const step = (candidate.param === 'LINK_THRESHOLD' || candidate.param === 'POSSIBLE_THRESHOLD')
      ? THRESHOLD_STEP
      : SIGNAL_WEIGHT_STEP;
    const newValue = Math.max(1, prevValue + candidate.direction * step);
    const key = `${String(candidate.param)}:${prevValue}->${newValue}`;
    if (newValue !== prevValue && !rejectedChanges.has(key)) return candidate;
  }

  return {
    param: 'LINK_THRESHOLD',
    direction: agg.overallPrecision < TARGET_PRECISION ? 1 : -1,
    reasoning: 'All preferred changes already tested; revisiting global threshold',
  };
}

function meetsTargets(agg: AggregateAccuracy): boolean {
  return (
    agg.overallF1 >= TARGET_F1 &&
    agg.overallPrecision >= TARGET_PRECISION &&
    agg.overallRecall >= TARGET_RECALL
  );
}

// ---------------------------------------------------------------------------
// Run all datasets with a given config
// ---------------------------------------------------------------------------

async function runAllDatasets(
  descriptors: Array<{ size: number; idx: number }>,
  cfg: TuneConfig,
  store: MockStore,
  iteration: number,
): Promise<AggregateAccuracy> {
  const results = [];
  const total = descriptors.length;
  for (let i = 0; i < total; i++) {
    const { size, idx } = descriptors[i];
    const t0 = Date.now();
    const { orders, gt } = loadDataset(size, idx);
    const { orderToProfile, linkedPairs } = runLocalPipeline(orders, cfg, store);
    const result = measureAccuracy(gt, orderToProfile, orders.length, { orders, linkedPairs });
    results.push(result);
    log(`    dataset_${size}_${idx} [${i + 1}/${total}] ${Date.now() - t0}ms │ F1=${(result.f1 * 100).toFixed(1)}%`);
  }
  return aggregateAccuracy(results, iteration, cfg);
}

// ---------------------------------------------------------------------------
// Main tuning loop
// ---------------------------------------------------------------------------

export async function runTuningLoop(
  datasets: Array<{ size: number; idx: number }>,
  initialConfig: TuneConfig,
  onProgress?: (entry: TuningLogEntry, agg: AggregateAccuracy) => void,
  startIteration = 0,
  checkpointFile?: string,
): Promise<TuningResult> {
  const store  = new MockStore();
  const tuneLog: TuningLogEntry[] = [];
  let   cfg    = cloneConfig(initialConfig);
  let   bestCfg = cloneConfig(cfg);
  let   bestF1  = 0;
  let   plateauCount = 0;
  let   stopReason: TuningResult['stopReason'] = 'max_iterations';
  const rejectedChanges = new Set<string>();

  function saveCheckpoint(iter: number, agg: AggregateAccuracy): void {
    if (!checkpointFile) return;
    try {
      fs.writeFileSync(checkpointFile, JSON.stringify({
        iteration: iter,
        bestF1,
        config: bestCfg,
        log: tuneLog,
        metrics: { f1: agg.overallF1, precision: agg.overallPrecision, recall: agg.overallRecall },
      }, null, 2));
    } catch { /* non-fatal */ }
  }

  // Baseline (skip if resuming)
  let currentAgg: AggregateAccuracy;
  if (startIteration > 0) {
    log(`Skipping baseline (resumed at iteration ${startIteration})`);
    currentAgg = await runAllDatasets(datasets, cfg, store, startIteration);
    bestF1 = currentAgg.overallF1;
    bestCfg = cloneConfig(cfg);
  } else {
    log('--- Baseline pass ---');
    currentAgg = await runAllDatasets(datasets, cfg, store, 0);
    bestF1 = currentAgg.overallF1;
    bestCfg = cloneConfig(cfg);
    log(`[Baseline] F1=${(bestF1 * 100).toFixed(2)}% P=${(currentAgg.overallPrecision*100).toFixed(2)}% R=${(currentAgg.overallRecall*100).toFixed(2)}%`);
  }

  if (meetsTargets(currentAgg)) {
    return { bestConfig: bestCfg, bestF1, log: tuneLog, finalMetrics: currentAgg, stopReason: 'target_reached' };
  }

  for (let iter = startIteration + 1; iter <= MAX_ITERATIONS; iter++) {
    const iterStart = Date.now();
    log(`--- Iter ${iter}/${MAX_ITERATIONS} | bestF1=${(bestF1*100).toFixed(2)}% | plateau=${plateauCount}/${PLATEAU_WINDOW} ---`);

    const mode = dominantMode(currentAgg);
    const { param, direction, reasoning } = pickParamToTune(mode, currentAgg, cfg, iter, rejectedChanges);

    const prevValue = cfg[param] as number;
    const step = (param === 'LINK_THRESHOLD' || param === 'POSSIBLE_THRESHOLD')
      ? THRESHOLD_STEP
      : SIGNAL_WEIGHT_STEP;
    const newValue = Math.max(1, prevValue + direction * step);

    if (newValue === prevValue) {
      // Already at boundary
      plateauCount++;
      log(`  ${param} already at boundary (${prevValue}), skipping`);
    } else {
      const newCfg = cloneConfig(cfg);
      (newCfg as unknown as Record<string, number>)[param] = newValue;
      log(`  Testing ${param}: ${prevValue} → ${newValue}  (${reasoning})`);

      const newAgg = await runAllDatasets(datasets, newCfg, store, iter);
      const improvedF1 = newAgg.overallF1 > currentAgg.overallF1 + 0.0005;
      const precisionGate = newAgg.overallPrecision >= TARGET_PRECISION;
      const recallGate = newAgg.overallRecall >= Math.max(MIN_ACCEPT_RECALL, currentAgg.overallRecall - 0.02);
      const improved = improvedF1 && precisionGate && recallGate;

      const entry: TuningLogEntry = {
        iteration:           iter,
        paramChanged:        param,
        previousValue:       prevValue,
        newValue,
        reasoning,
        beforeF1:            currentAgg.overallF1,
        afterF1:             newAgg.overallF1,
        beforePrecision:     currentAgg.overallPrecision,
        afterPrecision:      newAgg.overallPrecision,
        beforeRecall:        currentAgg.overallRecall,
        afterRecall:         newAgg.overallRecall,
        accepted:            improved,
        dominantFailureMode: mode,
      };
      tuneLog.push(entry);
      onProgress?.(entry, newAgg);

      const elapsed = ((Date.now() - iterStart) / 1000).toFixed(1);
      const rejectionReason = improved
        ? ''
        : !improvedF1
          ? ' (no F1 lift)'
          : !precisionGate
            ? ` (precision ${(newAgg.overallPrecision * 100).toFixed(2)}% < ${(TARGET_PRECISION * 100).toFixed(0)}%)`
            : ` (recall ${(newAgg.overallRecall * 100).toFixed(2)}% below guardrail)`;
      log(
        `[Iter ${iter}] ${param}: ${prevValue}→${newValue} | F1: ${(currentAgg.overallF1*100).toFixed(2)}%→${(newAgg.overallF1*100).toFixed(2)}% | P ${(newAgg.overallPrecision*100).toFixed(2)}% | R ${(newAgg.overallRecall*100).toFixed(2)}% | ${improved ? '✓ accepted' : `✗ rejected${rejectionReason}`} | ${elapsed}s`
      );

      if (improved) {
        cfg = newCfg;
        currentAgg = newAgg;
        plateauCount = 0;

        if (newAgg.overallF1 > bestF1) {
          bestF1 = newAgg.overallF1;
          bestCfg = cloneConfig(cfg);
        }

        saveCheckpoint(iter, newAgg);

        if (meetsTargets(newAgg)) {
          stopReason = 'target_reached';
          break;
        }
      } else {
        rejectedChanges.add(`${String(param)}:${prevValue}->${newValue}`);
        plateauCount++;
        saveCheckpoint(iter, currentAgg);
      }
    }

    if (plateauCount >= PLATEAU_WINDOW) {
      stopReason = 'plateau';
      log(`Plateau detected after ${PLATEAU_WINDOW} non-improving iterations.`);
      break;
    }
  }

  log('--- Final evaluation pass ---');
  const finalMetrics = await runAllDatasets(datasets, bestCfg, store, -1);
  return { bestConfig: bestCfg, bestF1, log: tuneLog, finalMetrics, stopReason };
}
