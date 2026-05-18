#!/usr/bin/env ts-node
/**
 * scripts/eval/runEval.ts
 *
 * Multi-merchant eval runner for the US benchmark v1 dataset.
 *
 * Usage:
 *   npm run eval -- --dataset test-data/us_benchmark_v1.csv \
 *                   --ground-truth test-data/us_benchmark_v1_ground_truth.json \
 *                   --merchant-a merchant_a --merchant-b merchant_b \
 *                   --output reports/us_benchmark_v1_results.json
 *
 * Differs from scripts/eval.ts in three ways:
 *   1. Accepts a JSON ground-truth file with per-order cohort/cluster/trap/ring metadata
 *   2. Runs scoreOrders twice: per-merchant (production-like, no cross-merchant)
 *      and consortium (all data combined; cross-merchant via shared email/etc.)
 *   3. Emits per-order predictions, per-cohort metrics, per-signal contribution,
 *      cross-merchant ring detection rate, and false-positive / false-negative lists.
 */

// Set the identity salt before any hashing happens
process.env.IDENTITY_SALT =
  process.env.IDENTITY_SALT || 'eval-salt-00000000000000000000000000000000000000000000000000000000000000000000';

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { cleanRow } from '../../lib/csv/clean';
import { csvRowSchema } from '../../lib/csv/schema';
import { normaliseRow } from '../../lib/csv/normalise';
import { scoreOrders } from '../../lib/engine';
import { FLAG_THRESHOLD, SIGNAL_WEIGHTS } from '../../lib/engine/weights';
import type { NormalisedOrder, ScoredOrder } from '../../lib/engine/types';
import type { CrossMerchantProfile } from '../../lib/engine/fastContext';

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

interface Args {
  dataset: string;
  groundTruth: string;
  merchantA: string;
  merchantB: string;
  output: string;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === '--dataset') { args.dataset = v; i++; }
    else if (a === '--ground-truth') { args.groundTruth = v; i++; }
    else if (a === '--merchant-a') { args.merchantA = v; i++; }
    else if (a === '--merchant-b') { args.merchantB = v; i++; }
    else if (a === '--output') { args.output = v; i++; }
  }
  for (const k of ['dataset', 'groundTruth', 'merchantA', 'merchantB', 'output'] as const) {
    if (!args[k]) throw new Error(`Missing required arg --${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
  }
  return args as Args;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────

interface LoadedRow {
  order: NormalisedOrder;
  merchant_id: string;
  raw_ground_truth: 'FRAUDSTER' | 'SUSPICIOUS' | 'LEGITIMATE' | 'LEGITIMATE_SHARED' | string;
}

function loadDataset(csvPath: string): LoadedRow[] {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });
  const rows: LoadedRow[] = [];
  let skipped = 0;
  for (const r of parsed.data) {
    // Translate spec column names to engine's expected names
    const mapped: Record<string, unknown> = {
      order_id: r['order_id'],
      order_date: r['order_date'],
      customer_email: r['customer_email'],
      customer_name: r['customer_name'],
      shipping_address: r['shipping_address'],
      billing_address: r['billing_address'],
      order_total: r['order_value'],
      order_status: r['order_status'],
      customer_phone: r['phone_number'],
      ip_address: r['device_ip'],
      browser_fingerprint: r['browser_fingerprint'],
      cookie_id: r['cookie_id'],
      user_agent: r['user_agent'],
      card_last4: r['card_last4'],
      card_bin: r['card_bin'],
      payment_method: r['payment_method'],
      ground_truth_label: r['ground_truth_label'],
      refund_requested: r['refund_claimed'],
      chargeback_dispute: r['chargeback_filed'],
      refund_reason: r['refund_reason'],
      refund_date: r['refund_date'],
      delivery_status: r['delivery_status'],
      refund_status: r['refund_claimed'] === 'true' ? 'full' : 'none',
    };
    const cleaned = cleanRow(mapped);
    const result = csvRowSchema.safeParse(cleaned);
    if (!result.success) { skipped++; continue; }
    const order = normaliseRow(result.data);
    rows.push({
      order,
      merchant_id: r['merchant_id'] ?? '',
      raw_ground_truth: r['ground_truth_label'] ?? '',
    });
  }
  if (skipped > 0) {
    console.warn(`[eval] skipped ${skipped} rows that failed schema validation`);
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ground truth
// ─────────────────────────────────────────────────────────────────────────────

interface GroundTruthOrderEntry {
  cohort: number;
  subtype: string;
  cluster_id: string;
  ground_truth_label: 'FRAUDSTER' | 'SUSPICIOUS' | 'LEGITIMATE' | 'LEGITIMATE_SHARED';
  merchant_id: string;
  counts_toward_recall: boolean;
  counts_toward_fpr: boolean;
  ring_id?: string;
  trap_id?: string;
}

interface GroundTruth {
  meta: {
    total_orders: number;
    merchant_a_orders: number;
    merchant_b_orders: number;
    cohort_breakdown: Record<string, { orders: number; identities: number }>;
    recall_denominator: string;
    false_positive_denominator: string;
  };
  fraud_rings: Array<{
    ring_id: string;
    type: string;
    cohort: number;
    subtype: string;
    merchant_a_order_ids: string[];
    merchant_b_order_ids: string[];
    cluster_id: string;
    shared_signals: string[];
    expected_co_occurrence: boolean;
    link_confidence: string;
  }>;
  identity_clusters: Array<{
    cluster_id: string;
    cohort: number;
    subtype: string;
    ground_truth_label: string;
    order_ids: string[];
    canonical_signals: Record<string, string[]>;
    should_link_to: string[];
    must_not_link_to: string[];
  }>;
  false_positive_traps: Array<{
    trap_id: string;
    subtype: string;
    description: string;
    innocent_order_ids: string[];
    shadowed_cluster_id: string;
    shared_signal: string;
    shared_signal_value: string;
    should_be_linked: boolean;
    why_it_shouldnt_link: string;
  }>;
  order_index: Record<string, GroundTruthOrderEntry>;
}

function loadGroundTruth(jsonPath: string): GroundTruth {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as GroundTruth;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics
// ─────────────────────────────────────────────────────────────────────────────

const COHORT_KEYS: Record<number, string> = {
  1: 'cohort_1_serial_inr',
  2: 'cohort_2_cross_merchant_rings',
  3: 'cohort_3_return_fraud',
  4: 'cohort_4_chargeback_specialists',
  5: 'cohort_5_first_order_fraudsters',
  6: 'cohort_6_legitimate',
  7: 'cohort_7_legitimate_shared',
};

interface ScoredPrediction {
  order_id: string;
  merchant_id: string;
  cohort: number;
  subtype: string;
  cluster_id: string;
  ring_id?: string;
  trap_id?: string;
  ground_truth_label: string;
  counts_toward_recall: boolean;
  counts_toward_fpr: boolean;
  // Per-merchant scoring (production-like)
  per_merchant_score: number;
  per_merchant_flagged: boolean;
  per_merchant_signals_fired: string[];
  // Consortium scoring (all merchants combined)
  consortium_score: number;
  consortium_flagged: boolean;
  consortium_signals_fired: string[];
  // Order details for human inspection
  order_total: number;
  customer_name: string;
  email_hash: string;
}

interface CohortMetrics {
  orders_in_cohort: number;
  identities: number;
  flagged_per_merchant: number;
  flagged_consortium: number;
  true_positives_per_merchant: number;
  true_positives_consortium: number;
  false_negatives_per_merchant: number;
  false_negatives_consortium: number;
  false_positives_per_merchant: number;
  false_positives_consortium: number;
  recall_per_merchant: number | null;
  recall_consortium: number | null;
  fpr_per_merchant: number | null;
  fpr_consortium: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main(): void {
  const args = parseArgs(process.argv);
  console.log('[eval] Loading dataset:', args.dataset);
  const all = loadDataset(args.dataset);
  console.log(`[eval] Loaded ${all.length} rows`);

  console.log('[eval] Loading ground truth:', args.groundTruth);
  const gt = loadGroundTruth(args.groundTruth);

  // Build orderId → merchant_id index from CSV (the actual loaded data)
  const merchantByOrderId = new Map<string, string>();
  for (const r of all) merchantByOrderId.set(r.order.orderId, r.merchant_id);

  // ── Per-merchant scoring (production-like) ──
  const ordersA = all.filter((r) => r.merchant_id === args.merchantA).map((r) => r.order);
  const ordersB = all.filter((r) => r.merchant_id === args.merchantB).map((r) => r.order);
  console.log(`[eval] Per-merchant: merchant_a=${ordersA.length} merchant_b=${ordersB.length}`);

  // Build CrossMerchantProfile[] per merchant-perspective. The signal's
  // self-exclusion filter assumes profiles can be drawn from a wider network;
  // with only 2 merchants every cross-merchant profile would otherwise be
  // filtered out as a self-match. Build the "view merchant_a has of the
  // network" — profiles aggregated from merchant_b orders only — and vice
  // versa. Each per-merchant profile set excludes the requesting merchant's
  // own contributions, matching the production privacy invariant
  // ("requesting merchant's own history excluded from the aggregate").
  // K-anon gate (merchant_count ≥ 3) is relaxed to ≥ 1 for this 2-merchant
  // benchmark; this is an eval accommodation, not a production change.
  const profilesForA = buildCrossMerchantProfilesFromMerchant(all, args.merchantB);
  const profilesForB = buildCrossMerchantProfilesFromMerchant(all, args.merchantA);
  console.log(`[eval] Built cross-merchant profiles: a-view=${profilesForA.length} b-view=${profilesForB.length}`);

  // Pass 1: score per-merchant with no network-fraudster-identifier set.
  // We use the engine's OWN judgment here to identify flagged orders —
  // their device identifiers feed pass 2's networkDeviceLink signal.
  // This mimics production: fraud_entities is built from prior merchant
  // uploads' engine-flagged orders, NOT from ground-truth labels.
  console.log('[eval] Pass 1 — scoring without network-link signal…');
  const pass1A = scoreOrders(ordersA, {
    crossMerchantProfiles: profilesForA,
    requestingMerchantId: args.merchantA,
  });
  const pass1B = scoreOrders(ordersB, {
    crossMerchantProfiles: profilesForB,
    requestingMerchantId: args.merchantB,
  });
  const networkFraudsterIdentifiers = buildNetworkFraudsterIdentifiers(
    pass1A.concat(pass1B),
    all,
  );
  console.log(`[eval] Built ${networkFraudsterIdentifiers.size} network fraudster identifiers from pass-1 flagged orders.`);

  console.log('[eval] Pass 2 — re-scoring merchant_a with network identifiers…');
  const scoredA = scoreOrders(ordersA, {
    crossMerchantProfiles: profilesForA,
    requestingMerchantId: args.merchantA,
    networkFraudsterIdentifiers,
  });
  console.log('[eval] Pass 2 — re-scoring merchant_b with network identifiers…');
  const scoredB = scoreOrders(ordersB, {
    crossMerchantProfiles: profilesForB,
    requestingMerchantId: args.merchantB,
    networkFraudsterIdentifiers,
  });

  // Index per-merchant by orderId
  const perMerchantByOrderId = new Map<string, ScoredOrder>();
  for (const s of scoredA) perMerchantByOrderId.set(s.order.orderId, s);
  for (const s of scoredB) perMerchantByOrderId.set(s.order.orderId, s);

  // ── Consortium scoring ──
  console.log('[eval] Scoring consortium (all merchants combined)…');
  const allOrders = all.map((r) => r.order);
  const scoredAll = scoreOrders(allOrders, {
    networkFraudsterIdentifiers,
  });
  const consortiumByOrderId = new Map<string, ScoredOrder>();
  for (const s of scoredAll) consortiumByOrderId.set(s.order.orderId, s);

  // ── Build per-order predictions ──
  const predictions: ScoredPrediction[] = [];
  for (const r of all) {
    const pm = perMerchantByOrderId.get(r.order.orderId);
    const con = consortiumByOrderId.get(r.order.orderId);
    const gtEntry = gt.order_index[r.order.orderId];
    if (!gtEntry || !pm || !con) continue;
    predictions.push({
      order_id: r.order.orderId,
      merchant_id: r.merchant_id,
      cohort: gtEntry.cohort,
      subtype: gtEntry.subtype,
      cluster_id: gtEntry.cluster_id,
      ring_id: gtEntry.ring_id,
      trap_id: gtEntry.trap_id,
      ground_truth_label: gtEntry.ground_truth_label,
      counts_toward_recall: gtEntry.counts_toward_recall,
      counts_toward_fpr: gtEntry.counts_toward_fpr,
      per_merchant_score: pm.totalScore,
      per_merchant_flagged: pm.flagged,
      per_merchant_signals_fired: pm.signals.filter((s) => s.fired).map((s) => s.name),
      consortium_score: con.totalScore,
      consortium_flagged: con.flagged,
      consortium_signals_fired: con.signals.filter((s) => s.fired).map((s) => s.name),
      order_total: r.order.orderTotal,
      customer_name: r.order.customerNameNorm,
      email_hash: r.order.emailHash,
    });
  }

  // ── Aggregate headline metrics (per-merchant mode is production-like) ──
  const headline = computeHeadline(predictions);

  // ── Per-cohort metrics ──
  const cohortMetrics: Record<string, CohortMetrics> = {};
  for (let c = 1; c <= 7; c++) {
    cohortMetrics[COHORT_KEYS[c]] = computeCohortMetrics(predictions.filter((p) => p.cohort === c));
  }

  // ── Per-signal contribution (per-merchant mode) ──
  const perSignalContribution = computePerSignalContribution(predictions, 'per_merchant_signals_fired');
  const perSignalContributionConsortium = computePerSignalContribution(predictions, 'consortium_signals_fired');

  // ── Per-signal precision when SIGNAL IS PRIMARY (only signal fired) ──
  const perSignalPrimary = computePrimarySignalAttribution(predictions);

  // ── Cross-merchant ring detection ──
  const crossMerchant = computeCrossMerchantDetection(predictions, gt);

  // ── False positive list (with rich context) ──
  const falsePositives = predictions
    .filter((p) => p.counts_toward_fpr && p.per_merchant_flagged)
    .map((p) => ({
      order_id: p.order_id,
      merchant_id: p.merchant_id,
      cohort: p.cohort,
      subtype: p.subtype,
      cluster_id: p.cluster_id,
      trap_id: p.trap_id,
      ground_truth_label: p.ground_truth_label,
      score: p.per_merchant_score,
      confidence_grade: scoreToGrade(p.per_merchant_score),
      signals_fired: p.per_merchant_signals_fired,
      order_total: p.order_total,
    }));

  // ── False negative list (FRAUDSTERS not flagged) ──
  const fnByCluster = new Map<string, {
    cluster_id: string;
    cohort: number;
    subtype: string;
    orders: { order_id: string; merchant_id: string; score: number; signals_fired: string[] }[];
  }>();
  for (const p of predictions) {
    if (!p.counts_toward_recall || p.per_merchant_flagged) continue;
    if (!fnByCluster.has(p.cluster_id)) {
      fnByCluster.set(p.cluster_id, { cluster_id: p.cluster_id, cohort: p.cohort, subtype: p.subtype, orders: [] });
    }
    fnByCluster.get(p.cluster_id)!.orders.push({
      order_id: p.order_id,
      merchant_id: p.merchant_id,
      score: p.per_merchant_score,
      signals_fired: p.per_merchant_signals_fired,
    });
  }
  const falseNegatives = Array.from(fnByCluster.values());

  // ── Review rate ──
  const totalOrders = predictions.length;
  const flaggedPerMerchant = predictions.filter((p) => p.per_merchant_flagged).length;
  const flaggedConsortium = predictions.filter((p) => p.consortium_flagged).length;
  const reviewRatePerMerchant = flaggedPerMerchant / totalOrders;
  const reviewRateConsortium = flaggedConsortium / totalOrders;

  // ── Final output ──
  const output = {
    meta: {
      dataset: args.dataset,
      ground_truth: args.groundTruth,
      total_orders: totalOrders,
      merchant_a_orders: predictions.filter((p) => p.merchant_id === args.merchantA).length,
      merchant_b_orders: predictions.filter((p) => p.merchant_id === args.merchantB).length,
      flag_threshold: FLAG_THRESHOLD,
      signal_weights: SIGNAL_WEIGHTS,
      generated_at: new Date().toISOString(),
    },
    headline: {
      per_merchant: headline.per_merchant,
      consortium: headline.consortium,
      review_rate_per_merchant: reviewRatePerMerchant,
      review_rate_consortium: reviewRateConsortium,
      cross_merchant_detection_rate: crossMerchant.detection_rate,
    },
    cohort_breakdown: cohortMetrics,
    per_signal_contribution: perSignalContribution,
    per_signal_contribution_consortium: perSignalContributionConsortium,
    per_signal_primary_attribution: perSignalPrimary,
    cross_merchant_rings: crossMerchant.rings,
    false_positives: falsePositives,
    false_negatives_by_cluster: falseNegatives,
    predictions, // full per-order detail for the diagnostic report
  };

  const outDir = path.dirname(path.resolve(args.output));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(args.output, JSON.stringify(output, null, 2));
  console.log(`[eval] Wrote results: ${args.output}`);

  // ── Console summary ──
  console.log('');
  console.log('=== HEADLINE (per-merchant, production-like) ===');
  console.log(`Precision:                  ${(headline.per_merchant.precision * 100).toFixed(2)}%`);
  console.log(`Recall:                     ${(headline.per_merchant.recall * 100).toFixed(2)}%`);
  console.log(`F1 score:                   ${(headline.per_merchant.f1 * 100).toFixed(2)}%`);
  console.log(`False Positive Rate:        ${(headline.per_merchant.fpr * 100).toFixed(2)}%`);
  console.log(`Review Rate:                ${(reviewRatePerMerchant * 100).toFixed(2)}%`);
  console.log(`Cross-Merchant Detection:   ${(crossMerchant.detection_rate * 100).toFixed(2)}%`);
  console.log('');
  console.log('=== CONSORTIUM (cross-merchant via shared signals) ===');
  console.log(`Precision:                  ${(headline.consortium.precision * 100).toFixed(2)}%`);
  console.log(`Recall:                     ${(headline.consortium.recall * 100).toFixed(2)}%`);
  console.log(`F1 score:                   ${(headline.consortium.f1 * 100).toFixed(2)}%`);
  console.log(`Review Rate:                ${(reviewRateConsortium * 100).toFixed(2)}%`);
  console.log('');
  console.log('Cohort breakdown:');
  for (let c = 1; c <= 7; c++) {
    const m = cohortMetrics[COHORT_KEYS[c]];
    console.log(`  ${COHORT_KEYS[c]}: orders=${m.orders_in_cohort} flag=${m.flagged_per_merchant} tp=${m.true_positives_per_merchant} fn=${m.false_negatives_per_merchant} fp=${m.false_positives_per_merchant}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface HeadlineMetrics {
  precision: number;
  recall: number;
  f1: number;
  fpr: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
}

function computeHeadline(predictions: ScoredPrediction[]): {
  per_merchant: HeadlineMetrics;
  consortium: HeadlineMetrics;
} {
  function compute(useConsortium: boolean): HeadlineMetrics {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const p of predictions) {
      const flagged = useConsortium ? p.consortium_flagged : p.per_merchant_flagged;
      // Only count rows that participate in recall or FPR computation
      if (p.counts_toward_recall) {
        if (flagged) tp++; else fn++;
      } else if (p.counts_toward_fpr) {
        if (flagged) fp++; else tn++;
      } // SUSPICIOUS: neither — excluded
    }
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    const fpr = fp + tn === 0 ? 0 : fp / (fp + tn);
    return { precision, recall, f1, fpr, true_positives: tp, false_positives: fp, false_negatives: fn, true_negatives: tn };
  }
  return { per_merchant: compute(false), consortium: compute(true) };
}

function computeCohortMetrics(predictions: ScoredPrediction[]): CohortMetrics {
  const orders_in_cohort = predictions.length;
  const identities = new Set(predictions.map((p) => p.cluster_id)).size;
  let tp_pm = 0, tp_co = 0, fn_pm = 0, fn_co = 0, fp_pm = 0, fp_co = 0;
  let flagged_pm = 0, flagged_co = 0;
  for (const p of predictions) {
    if (p.per_merchant_flagged) flagged_pm++;
    if (p.consortium_flagged) flagged_co++;
    if (p.counts_toward_recall) {
      if (p.per_merchant_flagged) tp_pm++; else fn_pm++;
      if (p.consortium_flagged) tp_co++; else fn_co++;
    } else if (p.counts_toward_fpr) {
      if (p.per_merchant_flagged) fp_pm++;
      if (p.consortium_flagged) fp_co++;
    }
  }
  const totalForRecall = tp_pm + fn_pm;
  const totalForFpr = predictions.filter((p) => p.counts_toward_fpr).length;
  return {
    orders_in_cohort,
    identities,
    flagged_per_merchant: flagged_pm,
    flagged_consortium: flagged_co,
    true_positives_per_merchant: tp_pm,
    true_positives_consortium: tp_co,
    false_negatives_per_merchant: fn_pm,
    false_negatives_consortium: fn_co,
    false_positives_per_merchant: fp_pm,
    false_positives_consortium: fp_co,
    recall_per_merchant: totalForRecall === 0 ? null : tp_pm / totalForRecall,
    recall_consortium: totalForRecall === 0 ? null : tp_co / totalForRecall,
    fpr_per_merchant: totalForFpr === 0 ? null : fp_pm / totalForFpr,
    fpr_consortium: totalForFpr === 0 ? null : fp_co / totalForFpr,
  };
}

function computePerSignalContribution(
  predictions: ScoredPrediction[],
  signalKey: 'per_merchant_signals_fired' | 'consortium_signals_fired',
): Record<string, { tp_fires: number; fp_fires: number; fn_present: number; precision_when_fires: number }> {
  const out: Record<string, { tp_fires: number; fp_fires: number; fn_present: number; precision_when_fires: number }> = {};
  for (const p of predictions) {
    for (const sig of p[signalKey]) {
      if (!out[sig]) out[sig] = { tp_fires: 0, fp_fires: 0, fn_present: 0, precision_when_fires: 0 };
      // The signal fired on this order; classify the order
      const flagged = signalKey === 'per_merchant_signals_fired' ? p.per_merchant_flagged : p.consortium_flagged;
      if (p.counts_toward_recall && flagged) out[sig].tp_fires++;
      else if (p.counts_toward_fpr && flagged) out[sig].fp_fires++;
      else if (p.counts_toward_recall && !flagged) out[sig].fn_present++;
    }
  }
  for (const sig of Object.keys(out)) {
    const denom = out[sig].tp_fires + out[sig].fp_fires;
    out[sig].precision_when_fires = denom === 0 ? 0 : out[sig].tp_fires / denom;
  }
  return out;
}

function computePrimarySignalAttribution(
  predictions: ScoredPrediction[],
): Record<string, { tp_when_primary: number; fp_when_primary: number; precision: number }> {
  const out: Record<string, { tp_when_primary: number; fp_when_primary: number; precision: number }> = {};
  for (const p of predictions) {
    if (!p.per_merchant_flagged) continue;
    if (p.per_merchant_signals_fired.length !== 1) continue; // PRIMARY = only signal fired
    const sig = p.per_merchant_signals_fired[0];
    if (!out[sig]) out[sig] = { tp_when_primary: 0, fp_when_primary: 0, precision: 0 };
    if (p.counts_toward_recall) out[sig].tp_when_primary++;
    else if (p.counts_toward_fpr) out[sig].fp_when_primary++;
  }
  for (const sig of Object.keys(out)) {
    const denom = out[sig].tp_when_primary + out[sig].fp_when_primary;
    out[sig].precision = denom === 0 ? 0 : out[sig].tp_when_primary / denom;
  }
  return out;
}

function computeCrossMerchantDetection(
  predictions: ScoredPrediction[],
  gt: GroundTruth,
): {
  detection_rate: number;
  rings: Array<{
    ring_id: string;
    type: string;
    subtype: string;
    identities: number;
    expected_co_occurrences: number;
    actual_per_merchant: { merchant_a_flagged_orders: number; merchant_b_flagged_orders: number; co_occurrence_detected: boolean };
    actual_consortium: { merchant_a_flagged_orders: number; merchant_b_flagged_orders: number; co_occurrence_detected: boolean };
    shared_signals: string[];
  }>;
} {
  const predByOrderId = new Map<string, ScoredPrediction>();
  for (const p of predictions) predByOrderId.set(p.order_id, p);

  const rings = gt.fraud_rings.map((ring) => {
    let aPm = 0, bPm = 0, aCo = 0, bCo = 0;
    for (const oid of ring.merchant_a_order_ids) {
      const p = predByOrderId.get(oid);
      if (!p) continue;
      if (p.per_merchant_flagged) aPm++;
      if (p.consortium_flagged) aCo++;
    }
    for (const oid of ring.merchant_b_order_ids) {
      const p = predByOrderId.get(oid);
      if (!p) continue;
      if (p.per_merchant_flagged) bPm++;
      if (p.consortium_flagged) bCo++;
    }
    return {
      ring_id: ring.ring_id,
      type: ring.type,
      subtype: ring.subtype,
      identities: 1,
      expected_co_occurrences: 1,
      actual_per_merchant: {
        merchant_a_flagged_orders: aPm,
        merchant_b_flagged_orders: bPm,
        co_occurrence_detected: aPm > 0 && bPm > 0,
      },
      actual_consortium: {
        merchant_a_flagged_orders: aCo,
        merchant_b_flagged_orders: bCo,
        co_occurrence_detected: aCo > 0 && bCo > 0,
      },
      shared_signals: ring.shared_signals,
    };
  });
  // Detection rate: use consortium since the spec measures "cross-merchant signal in fraud_entity_co_occurrences"
  // which is the cross-merchant view the engine produces when given the union of data.
  const detected = rings.filter((r) => r.actual_consortium.co_occurrence_detected).length;
  return { detection_rate: rings.length === 0 ? 0 : detected / rings.length, rings };
}

function scoreToGrade(score: number): 'Definite' | 'Probable' | 'Possible' | 'Weak' {
  if (score >= 75) return 'Definite';
  if (score >= 55) return 'Probable';
  if (score >= 35) return 'Possible';
  return 'Weak';
}

/**
 * Build CrossMerchantProfile[] containing ONLY contributions from a single
 * source merchant. This is the view another merchant has of the network:
 * "what did this OTHER merchant see for these identities?".
 *
 * Production behaviour aggregates the requesting merchant's history out
 * before exposing the profile; with two merchants we partition the data
 * explicitly and let the signal score against the partition.
 */
function buildCrossMerchantProfilesFromMerchant(
  rows: LoadedRow[],
  sourceMerchant: string,
): CrossMerchantProfile[] {
  type Raw = {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawPhone?: string | null;
    _rawCardLast4?: string | null;
  };
  // Only look at rows from the source merchant — those are the contributions
  // an "other" merchant would have visible via the consortium.
  const sourceRows = rows.filter((r) => r.merchant_id === sourceMerchant);
  // Union-find over identity values to group orders into identities.
  const parent = new Map<string, string>();
  function find(x: string): string {
    let p = parent.get(x);
    if (!p || p === x) { parent.set(x, x); return x; }
    const r = find(p);
    parent.set(x, r);
    return r;
  }
  function union(a: string, b: string) {
    const ra = find(a); const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const key = (kind: string, v: string) => `${kind}:${v}`;
  const orderIdentities: { idx: number; vals: string[] }[] = [];
  for (let i = 0; i < sourceRows.length; i++) {
    const r = sourceRows[i];
    const o = r.order as NormalisedOrder & Raw;
    const vals: string[] = [];
    const e = o._rawEmail?.toLowerCase().trim(); if (e) vals.push(key('email', e));
    if (o._rawIP) vals.push(key('ip', o._rawIP));
    if (o._rawAddress) vals.push(key('addr', o._rawAddress));
    if (o._rawPhone) vals.push(key('phone', o._rawPhone));
    if (o._rawCardLast4) vals.push(key('card', o._rawCardLast4));
    orderIdentities.push({ idx: i, vals });
    for (let j = 1; j < vals.length; j++) union(vals[0], vals[j]);
  }
  const groupOrders = new Map<string, number[]>();
  for (const { idx, vals } of orderIdentities) {
    if (vals.length === 0) continue;
    const root = find(vals[0]);
    if (!groupOrders.has(root)) groupOrders.set(root, []);
    groupOrders.get(root)!.push(idx);
  }
  // Emit one profile per identity that appears at this source merchant.
  // merchant_ids is set to [sourceMerchant] — so when the signal checks
  // "does this profile include the requestingMerchantId" the answer is no
  // and the profile is used as cross-merchant intelligence.
  const profiles: CrossMerchantProfile[] = [];
  let profileSeq = 0;
  for (const indices of groupOrders.values()) {
    const emails = new Set<string>();
    const ips = new Set<string>();
    const addresses = new Set<string>();
    const card_last4s = new Set<string>();
    const phones = new Set<string>();
    let totalOrders = 0;
    let totalRefundClaims = 0;
    for (const i of indices) {
      const r = sourceRows[i];
      const o = r.order as NormalisedOrder & Raw;
      const e = o._rawEmail?.toLowerCase().trim(); if (e) emails.add(e);
      if (o._rawIP) ips.add(o._rawIP);
      if (o._rawAddress) addresses.add(o._rawAddress);
      if (o._rawPhone) phones.add(o._rawPhone);
      if (o._rawCardLast4) card_last4s.add(o._rawCardLast4);
      totalOrders++;
      if (o.refundRequested === true || o.refundStatus === 'full' || o.refundStatus === 'partial') {
        totalRefundClaims++;
      }
    }
    if (totalOrders === 0) continue;
    profileSeq++;
    profiles.push({
      id: `eval_profile_${sourceMerchant}_${profileSeq}`,
      emails: Array.from(emails),
      ips: Array.from(ips),
      addresses: Array.from(addresses),
      card_last4s: Array.from(card_last4s),
      phones: Array.from(phones),
      total_orders: totalOrders,
      total_refund_claims: totalRefundClaims,
      total_merchants_seen_at: 1, // observed at one source merchant
      merchant_ids: [sourceMerchant],
    });
  }
  return profiles;
}

/**
 * Build a set of "network fraudster identifiers" from the engine's pass-1
 * flagged orders. The key insight (and the anti-cheating discipline the user
 * called out): use the engine's OWN judgments here, NOT ground-truth labels.
 *
 * This mirrors production where `fraud_entities` is populated from previously
 * uploaded merchants' engine-flagged orders. When a new order is scored, the
 * networkDeviceLink signal asks "is this IP / fingerprint in the consortium
 * fraud-entities table?" — and the table contents are the engine's own
 * decisions on prior data, not labels.
 *
 * We key the set as `ip:<value>` and `fp:<value>` so the signal can do a
 * single map lookup without confusing IP and fingerprint hashes.
 */
function buildNetworkFraudsterIdentifiers(
  scored: ScoredOrder[],
  rows: LoadedRow[],
): Set<string> {
  type Raw = { _rawIP?: string | null };
  const byOrderId = new Map<string, LoadedRow>();
  for (const r of rows) byOrderId.set(r.order.orderId, r);
  // Group flagged orders by emailHash to find PERSISTENT flagged identities.
  // A single flagged order from a customer isn't enough to call them a network
  // fraudster — in production fraud_entities also only populates from
  // identities with multiple flagged events. Requiring ≥2 flagged orders per
  // emailHash filters out the self-confirmation cascade where a pass-1
  // false positive contributes its own identifier and amplifies itself
  // in pass 2.
  const flaggedByEmail = new Map<string, ScoredOrder[]>();
  for (const s of scored) {
    if (!s.flagged) continue;
    const list = flaggedByEmail.get(s.order.emailHash) ?? [];
    list.push(s);
    flaggedByEmail.set(s.order.emailHash, list);
  }
  const out = new Set<string>();
  for (const [, list] of flaggedByEmail) {
    if (list.length < 2) continue;
    for (const s of list) {
      const r = byOrderId.get(s.order.orderId);
      if (!r) continue;
      const o = r.order as NormalisedOrder & Raw;
      if (o._rawIP) out.add(`ip:${o._rawIP}`);
      if (s.order.browserFingerprint) out.add(`fp:${s.order.browserFingerprint}`);
    }
  }
  return out;
}

// Legacy union-of-merchants builder (kept for reference; not used).
function buildCrossMerchantProfiles(
  rows: LoadedRow[],
  merchantA: string,
  merchantB: string,
): CrossMerchantProfile[] {
  type Raw = {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawPhone?: string | null;
    _rawCardLast4?: string | null;
  };
  // Union-find over identity values.
  const parent = new Map<string, string>();
  function find(x: string): string {
    let p = parent.get(x);
    if (!p || p === x) { parent.set(x, x); return x; }
    const r = find(p);
    parent.set(x, r);
    return r;
  }
  function union(a: string, b: string) {
    const ra = find(a); const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const key = (kind: string, v: string) => `${kind}:${v}`;
  // Bind every order's identity values together.
  const orderIdentities: { idx: number; vals: string[] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const o = r.order as NormalisedOrder & Raw;
    const vals: string[] = [];
    const e = o._rawEmail?.toLowerCase().trim(); if (e) vals.push(key('email', e));
    const ip = o._rawIP ?? null; if (ip) vals.push(key('ip', ip));
    const ad = o._rawAddress ?? null; if (ad) vals.push(key('addr', ad));
    const ph = o._rawPhone ?? null; if (ph) vals.push(key('phone', ph));
    const c4 = o._rawCardLast4 ?? null; if (c4) vals.push(key('card', c4));
    orderIdentities.push({ idx: i, vals });
    for (let j = 1; j < vals.length; j++) union(vals[0], vals[j]);
  }
  // Group orders by root.
  const groupOrders = new Map<string, number[]>();
  for (const { idx, vals } of orderIdentities) {
    if (vals.length === 0) continue;
    const root = find(vals[0]);
    if (!groupOrders.has(root)) groupOrders.set(root, []);
    groupOrders.get(root)!.push(idx);
  }
  // Build CrossMerchantProfile per group, filter to ≥2 distinct merchants.
  const profiles: CrossMerchantProfile[] = [];
  let profileSeq = 0;
  for (const [root, indices] of groupOrders.entries()) {
    const merchants = new Set<string>();
    const emails = new Set<string>();
    const ips = new Set<string>();
    const addresses = new Set<string>();
    const card_last4s = new Set<string>();
    const phones = new Set<string>();
    let totalOrders = 0;
    let totalRefundClaims = 0;
    for (const i of indices) {
      const r = rows[i];
      const o = r.order as NormalisedOrder & Raw;
      merchants.add(r.merchant_id);
      const e = o._rawEmail?.toLowerCase().trim(); if (e) emails.add(e);
      if (o._rawIP) ips.add(o._rawIP);
      if (o._rawAddress) addresses.add(o._rawAddress);
      if (o._rawPhone) phones.add(o._rawPhone);
      if (o._rawCardLast4) card_last4s.add(o._rawCardLast4);
      totalOrders++;
      if (o.refundRequested === true || o.refundStatus === 'full' || o.refundStatus === 'partial') {
        totalRefundClaims++;
      }
    }
    if (!(merchants.has(merchantA) && merchants.has(merchantB))) continue;
    profileSeq++;
    profiles.push({
      id: `eval_profile_${profileSeq}`,
      emails: Array.from(emails),
      ips: Array.from(ips),
      addresses: Array.from(addresses),
      card_last4s: Array.from(card_last4s),
      phones: Array.from(phones),
      total_orders: totalOrders,
      total_refund_claims: totalRefundClaims,
      total_merchants_seen_at: merchants.size,
      merchant_ids: Array.from(merchants),
    });
    void root;
  }
  return profiles;
}

main();
