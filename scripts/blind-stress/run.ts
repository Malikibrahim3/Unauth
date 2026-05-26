#!/usr/bin/env ts-node
// Blind stress-test harness for fraud + identity engine.
// Loads scenario CSVs, runs scoring read-only (no DB writes), evaluates
// against ground-truth JSON, and emits a per-scenario report.

process.env.IDENTITY_SALT =
  process.env.IDENTITY_SALT || 'blind-stress-salt-0000000000000000000000000000000000000000000000000000000000';

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { cleanRow } from '../../lib/csv/clean';
import { csvRowSchema } from '../../lib/csv/schema';
import { normaliseRow } from '../../lib/csv/normalise';
import { scoreOrders } from '../../lib/engine';
import type { NormalisedOrder, ScoredOrder, ConfidenceGrade } from '../../lib/engine/types';
import type { CrossMerchantProfile } from '../../lib/engine/fastContext';
import { linkIdentities, type LinkerOrderInput } from '../../lib/linker';

const DATA_DIR = path.join(__dirname, 'data');
const REPORT_DIR = path.join(__dirname, 'reports');

interface GroundTruthOrder {
  fraudLabel: 'fraud' | 'legitimate';
  customerId: string;
  ringId?: string;
  merchantId: string;
  cohort?: string;
}
interface GroundTruth {
  scenario: number;
  description: string;
  orders: Record<string, GroundTruthOrder>;
  rings: Array<{ ringId: string; memberCustomerIds: string[]; merchantIds: string[]; suppressed?: boolean }>;
}

interface LoadedRow {
  order: NormalisedOrder & { _rawEmail?: string; _rawIP?: string | null; _rawAddress?: string | null; _rawPhone?: string | null; _rawPostcode?: string | null; _rawCardLast4?: string | null; _rawCardBin?: string | null; _rawCardFingerprint?: string | null; _rawDeviceId?: string | null; _rawAccountId?: string | null };
  merchant_id: string;
  raw: Record<string, string>;
}

function loadCsv(csvPath: string): { rows: LoadedRow[]; skipped: number; total: number; duplicates: number } {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const rows: LoadedRow[] = [];
  let skipped = 0;
  let duplicates = 0;
  const seenIds = new Set<string>();
  for (const r of parsed.data) {
    const cleaned = cleanRow(r);
    const v = csvRowSchema.safeParse(cleaned);
    if (!v.success) { skipped++; continue; }
    if (seenIds.has(v.data.order_id)) { duplicates++; continue; }
    seenIds.add(v.data.order_id);
    const order = normaliseRow(v.data);
    rows.push({ order, merchant_id: r['merchant_id'] ?? '', raw: r });
  }
  return { rows, skipped, total: parsed.data.length, duplicates };
}

// Build CrossMerchantProfile[] for a given requesting merchant view.
// k-anon: only profiles seen at ≥3 distinct merchants are returned.
// The requesting merchant is excluded from the profile contributions
// (production privacy invariant).
function buildCrossMerchantProfiles(rows: LoadedRow[], requestingMerchant: string): CrossMerchantProfile[] {
  // Union-find on identity values from rows NOT belonging to requesting merchant.
  const others = rows.filter((r) => r.merchant_id !== requestingMerchant);
  const parent = new Map<string, string>();
  function find(x: string): string { let p = parent.get(x); if (!p || p === x) { parent.set(x, x); return x; } const r = find(p); parent.set(x, r); return r; }
  function union(a: string, b: string) { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(ra, rb); }
  const key = (k: string, v: string) => `${k}:${v}`;
  const items: { idx: number; vals: string[] }[] = [];
  for (let i = 0; i < others.length; i++) {
    const o = others[i].order;
    const vals: string[] = [];
    if (o._rawEmail) vals.push(key('email', o._rawEmail.toLowerCase().trim()));
    if (o._rawIP) vals.push(key('ip', o._rawIP));
    if (o._rawAddress) vals.push(key('addr', o._rawAddress));
    if (o._rawPhone) vals.push(key('phone', o._rawPhone));
    if (o._rawCardLast4) vals.push(key('card', o._rawCardLast4));
    items.push({ idx: i, vals });
    for (let j = 1; j < vals.length; j++) union(vals[0], vals[j]);
  }
  const groups = new Map<string, number[]>();
  for (const { idx, vals } of items) {
    if (vals.length === 0) continue;
    const root = find(vals[0]);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(idx);
  }
  const profiles: CrossMerchantProfile[] = [];
  let seq = 0;
  for (const indices of groups.values()) {
    const emails = new Set<string>();
    const ips = new Set<string>();
    const addresses = new Set<string>();
    const cards = new Set<string>();
    const phones = new Set<string>();
    const merchantsSeen = new Set<string>();
    let totalOrders = 0;
    let refundClaims = 0;
    for (const i of indices) {
      const r = others[i];
      const o = r.order;
      if (o._rawEmail) emails.add(o._rawEmail.toLowerCase().trim());
      if (o._rawIP) ips.add(o._rawIP);
      if (o._rawAddress) addresses.add(o._rawAddress);
      if (o._rawPhone) phones.add(o._rawPhone);
      if (o._rawCardLast4) cards.add(o._rawCardLast4);
      merchantsSeen.add(r.merchant_id);
      totalOrders++;
      if (o.refundRequested === true || o.refundStatus === 'full' || o.refundStatus === 'partial') refundClaims++;
    }
    if (merchantsSeen.size < 3) continue; // k-anon gate
    seq++;
    profiles.push({
      id: `prof_${requestingMerchant}_${seq}`,
      emails: Array.from(emails),
      ips: Array.from(ips),
      addresses: Array.from(addresses),
      card_last4s: Array.from(cards),
      phones: Array.from(phones),
      total_orders: totalOrders,
      total_refund_claims: refundClaims,
      total_merchants_seen_at: merchantsSeen.size,
      merchant_ids: Array.from(merchantsSeen),
    });
  }
  return profiles;
}

function buildLinkerInputs(rows: LoadedRow[]): LinkerOrderInput[] {
  return rows.map((r) => {
    const o = r.order;
    return {
      order_id: o.orderId,
      email: o._rawEmail ?? null,
      phone: o._rawPhone ?? null,
      address: o._rawAddress ?? null,
      shipping_address: o._rawAddress ?? null,
      postcode: o._rawPostcode ?? null,
      ip: o._rawIP ?? null,
      card_last4: o._rawCardLast4 ?? null,
      card_bin: o._rawCardBin ?? null,
      card_fingerprint: o._rawCardFingerprint ?? null,
      device_fingerprint: o._rawDeviceId ?? null,
      account_id: o._rawAccountId ?? null,
      name: o.customerNameNorm ?? null,
    };
  });
}

// Post-hoc confidence grade — mirrors scoreBatch's logic (lib/engine/fastScore.ts:889-917).
function computeConfidenceGrade(scored: ScoredOrder, customerOrderHistory: Map<string, NormalisedOrder[]>): ConfidenceGrade | null {
  const totalScore = scored.totalScore;
  const signals = scored.signals;

  const strongIdentifierTypes = new Set<string>();
  for (const signal of signals) {
    if (signal.fired && signal.identifierTypesUsed) {
      for (const type of signal.identifierTypesUsed) {
        if (type !== 'ip') strongIdentifierTypes.add(type);
      }
    }
  }
  const strongCount = strongIdentifierTypes.size;
  const emailSignalCount = signals.filter((s) =>
    s.fired && s.identifierTypesUsed && s.identifierTypesUsed.includes('email') && !s.identifierTypesUsed.includes('address')
  ).length;
  const multiCorroborated = emailSignalCount >= 3;
  const customerOrders = customerOrderHistory.get(scored.order.emailHash) ?? [];
  const isTwoOrderCluster = customerOrders.length <= 2;
  const hasCardEvidence = signals.some((s) => s.fired && s.identifierTypesUsed?.includes('card'));

  let grade: ConfidenceGrade | null;
  if (totalScore >= 75 && strongCount >= 2 && (hasCardEvidence || customerOrders.length >= 3)) grade = 'definite';
  else if (totalScore >= 75 && multiCorroborated && (hasCardEvidence || customerOrders.length >= 3) && !isTwoOrderCluster) grade = 'definite';
  else if (totalScore >= 75) grade = 'probable';
  else if (totalScore >= 50 && strongCount >= 2) grade = 'probable';
  else if (totalScore >= 25 && strongCount >= 1) grade = 'possible';
  else if (totalScore >= 25 && strongCount === 0) grade = 'weak';
  else grade = null;

  const hasNonIpSignal = signals.some((s) => s.fired && s.identifierTypesUsed && s.identifierTypesUsed.some((t) => t !== 'ip'));
  if (!hasNonIpSignal && grade !== null) grade = 'weak';
  return grade;
}

interface ScenarioMetrics {
  scenario: number;
  description: string;
  rows_loaded: number;
  rows_skipped: number;
  rows_duplicates_dropped: number;
  precision: number;
  recall: number;
  f1: number;
  fpr: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  flagged_count: number;
  fraud_count_gt: number;
  legitimate_count_gt: number;
  grade_distribution: Record<string, number>;
  identity_precision: number;
  identity_recall: number;
  cluster_count: number;
  signals_fired_count: Record<string, number>;
  false_definite_orders: Array<{ orderId: string; signals: string[]; score: number }>;
  signals_failed_to_fire: string[];
  latency_ms: number;
  // Ring-level diagnostics
  rings: Array<{ ringId: string; expected_orders: number; flagged_orders: number; max_grade: string; suppressed_expected?: boolean }>;
  // Cross-merchant
  cross_merchant_match_rate?: number;
  // Per-cohort FPR (101..104)
  cohort_fpr?: Record<string, { fp: number; n: number; fpr: number }>;
  // Legit-cohort customers that hit POSSIBLE or higher
  legit_cohort_flags?: Array<{ orderId: string; cohort: string; grade: string; signals: string[]; score: number }>;
  // In-scope fraud customers completely missed
  missed_fraud?: Array<{ customerId: string; ringId?: string; signals_fired_on_their_orders: string[] }>;
  // Scenario 106: per-ring cross-merchant surfacing
  s106_cross_rings_surfaced?: number;
  s106_cross_rings_total?: number;
  s106_single_rings_flagged_via_cross_merchant?: number;
  // Per-scenario benchmark check
  pass_summary: Record<string, { actual: string; target: string; pass: boolean }>;
}

const ALL_SIGNALS = [
  'refundRate','inrAbuse','velocity','inrSpeed','emailPattern','addressClustering','billingAddressClustering','valueAnomaly','paymentChurn','disputeHistory','addressMismatch','crossMerchant','refundPattern','networkDeviceLink',
];

function evaluateScenario(scenarioNum: number): ScenarioMetrics {
  const csvPath = path.join(DATA_DIR, `scenario-${scenarioNum}.csv`);
  const gtPath = path.join(DATA_DIR, `scenario-${scenarioNum}.gt.json`);
  const gt: GroundTruth = JSON.parse(fs.readFileSync(gtPath, 'utf-8'));

  const t0 = Date.now();
  const loaded = loadCsv(csvPath);
  const rows = loaded.rows;

  // Group by merchant
  const merchants = Array.from(new Set(rows.map((r) => r.merchant_id))).filter((m) => m);
  const allOrders = rows.map((r) => r.order);

  // Linker — single pass over all rows (gives identity clusters)
  const linkerInputs = buildLinkerInputs(rows);
  const linkerResult = linkIdentities(linkerInputs);

  // Score per-merchant with cross-merchant profiles built from the other merchants
  const scoredByOrderId = new Map<string, ScoredOrder>();
  // Build a customerOrderHistory map across ALL orders for grade computation
  const customerOrderHistory = new Map<string, NormalisedOrder[]>();
  for (const o of allOrders) {
    const arr = customerOrderHistory.get(o.emailHash) ?? [];
    arr.push(o);
    customerOrderHistory.set(o.emailHash, arr);
  }

  if (merchants.length > 1) {
    // Two-pass scoring (mirrors runEval): pass 1 → derive network identifiers → pass 2.
    const pass1All: ScoredOrder[] = [];
    for (const m of merchants) {
      const ordersM = rows.filter((r) => r.merchant_id === m).map((r) => r.order);
      const profiles = buildCrossMerchantProfiles(rows, m);
      const scored = scoreOrders(ordersM, {
        crossMerchantProfiles: profiles,
        requestingMerchantId: m,
      });
      pass1All.push(...scored);
    }
    // Network fraudster identifiers from pass-1 flagged orders with ≥2 per emailHash.
    const flaggedByEmail = new Map<string, ScoredOrder[]>();
    for (const s of pass1All) {
      if (!s.flagged) continue;
      const list = flaggedByEmail.get(s.order.emailHash) ?? [];
      list.push(s);
      flaggedByEmail.set(s.order.emailHash, list);
    }
    const networkIds = new Set<string>();
    const orderByOrderId = new Map<string, LoadedRow>();
    for (const r of rows) orderByOrderId.set(r.order.orderId, r);
    for (const [, list] of flaggedByEmail) {
      if (list.length < 2) continue;
      for (const s of list) {
        const r = orderByOrderId.get(s.order.orderId);
        if (!r) continue;
        if (r.order._rawIP) networkIds.add(`ip:${r.order._rawIP}`);
        if (s.order.browserFingerprint) networkIds.add(`fp:${s.order.browserFingerprint}`);
      }
    }
    for (const m of merchants) {
      const ordersM = rows.filter((r) => r.merchant_id === m).map((r) => r.order);
      const profiles = buildCrossMerchantProfiles(rows, m);
      const scored = scoreOrders(ordersM, {
        crossMerchantProfiles: profiles,
        requestingMerchantId: m,
        networkFraudsterIdentifiers: networkIds,
      });
      for (const s of scored) scoredByOrderId.set(s.order.orderId, s);
    }
  } else {
    // Single-merchant: score everything together, no cross-merchant
    const scored = scoreOrders(allOrders);
    for (const s of scored) scoredByOrderId.set(s.order.orderId, s);
  }

  const latency = Date.now() - t0;

  // ── Metric computation ──
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const gradeDist: Record<string, number> = { definite: 0, probable: 0, possible: 0, weak: 0, none: 0 };
  const signalsFired: Record<string, number> = {};
  for (const s of ALL_SIGNALS) signalsFired[s] = 0;
  const falseDefinite: Array<{ orderId: string; signals: string[]; score: number }> = [];
  const cohortFpr: Record<string, { fp: number; n: number; fpr: number }> = {};
  const legitCohortFlags: Array<{ orderId: string; cohort: string; grade: string; signals: string[]; score: number }> = [];
  // track signals fired per customer for missed-fraud diagnostics
  const customerOrders: Map<string, string[]> = new Map(); // customerId → orderIds
  const customerFlagged: Map<string, boolean> = new Map();
  const customerSignals: Map<string, Set<string>> = new Map();
  const customerRing: Map<string, string | undefined> = new Map();
  const POSSIBLE_OR_HIGHER = new Set(['possible', 'probable', 'definite']);

  for (const r of rows) {
    const scored = scoredByOrderId.get(r.order.orderId);
    if (!scored) continue;
    const gtEntry = gt.orders[r.order.orderId];
    if (!gtEntry) continue;
    const isFraud = gtEntry.fraudLabel === 'fraud';
    const grade = computeConfidenceGrade(scored, customerOrderHistory);
    gradeDist[grade ?? 'none']++;

    // Flagged = score ≥ FLAG_THRESHOLD and grade ∉ {null, weak} per scoreBatch
    const flagged = scored.flagged && grade !== null && grade !== 'weak';

    if (isFraud && flagged) tp++;
    else if (!isFraud && flagged) {
      fp++;
      if (grade === 'definite') falseDefinite.push({ orderId: r.order.orderId, signals: scored.signals.filter(s => s.fired).map(s => s.name), score: scored.totalScore });
    }
    else if (!isFraud && !flagged) tn++;
    else if (isFraud && !flagged) fn++;

    // Cohort tracking (legitimate only)
    if (!isFraud && gtEntry.cohort) {
      const c = gtEntry.cohort;
      if (!cohortFpr[c]) cohortFpr[c] = { fp: 0, n: 0, fpr: 0 };
      cohortFpr[c].n++;
      if (flagged) cohortFpr[c].fp++;
      // Possible-or-higher on legit cohort = harness bug report
      if (grade && POSSIBLE_OR_HIGHER.has(grade)) {
        legitCohortFlags.push({
          orderId: r.order.orderId,
          cohort: c,
          grade,
          signals: scored.signals.filter((s) => s.fired).map((s) => s.name),
          score: scored.totalScore,
        });
      }
    }

    // Track per-customer for missed-fraud
    const cid = gtEntry.customerId;
    const oids = customerOrders.get(cid) ?? [];
    oids.push(r.order.orderId);
    customerOrders.set(cid, oids);
    if (isFraud) {
      customerRing.set(cid, gtEntry.ringId);
      if (flagged) customerFlagged.set(cid, true);
      const sset = customerSignals.get(cid) ?? new Set<string>();
      for (const sig of scored.signals) if (sig.fired) sset.add(sig.name);
      customerSignals.set(cid, sset);
    }

    for (const sig of scored.signals) {
      if (sig.fired) signalsFired[sig.name] = (signalsFired[sig.name] ?? 0) + 1;
    }
  }
  for (const c of Object.keys(cohortFpr)) {
    cohortFpr[c].fpr = cohortFpr[c].n > 0 ? cohortFpr[c].fp / cohortFpr[c].n : 0;
  }

  // Missed-fraud: in-scope fraud customers with zero flagged orders
  const missedFraud: Array<{ customerId: string; ringId?: string; signals_fired_on_their_orders: string[] }> = [];
  for (const [cid, oids] of customerOrders) {
    if (oids.length === 0) continue;
    const firstOid = oids[0];
    const gtEntry = gt.orders[firstOid];
    if (!gtEntry || gtEntry.fraudLabel !== 'fraud') continue;
    if (customerFlagged.get(cid)) continue;
    missedFraud.push({
      customerId: cid,
      ringId: customerRing.get(cid),
      signals_fired_on_their_orders: Array.from(customerSignals.get(cid) ?? new Set()),
    });
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;

  // ── Identity precision/recall via linker clusters ──
  // For each linker cluster of ≥2 orders, every pair within the cluster is a "predicted same-person" pair.
  // Ground-truth: pair is "same person" if both orders share customerId in gt.
  // (Pairs across clusters / unclustered orders predicted "different persons".)
  let idTP = 0, idFP = 0, idFN = 0;
  // True positive same-person pairs: enumerate all gt.customerId-grouped pairs
  const gtCustomerToOrders = new Map<string, string[]>();
  for (const oid of Object.keys(gt.orders)) {
    const cid = gt.orders[oid].customerId;
    const arr = gtCustomerToOrders.get(cid) ?? [];
    arr.push(oid);
    gtCustomerToOrders.set(cid, arr);
  }
  // Predicted same-person pairs
  const predSameMap = new Map<string, Set<string>>(); // orderId → orderIds in same cluster
  for (const cluster of linkerResult.clusters) {
    for (const oa of cluster.order_ids) {
      for (const ob of cluster.order_ids) {
        if (oa === ob) continue;
        const s = predSameMap.get(oa) ?? new Set();
        s.add(ob);
        predSameMap.set(oa, s);
      }
    }
  }
  // For all GT customer-pairs:
  let gtSamePersonPairs = 0;
  for (const [, oids] of gtCustomerToOrders) {
    if (oids.length < 2) continue;
    for (let i = 0; i < oids.length; i++) {
      for (let j = i + 1; j < oids.length; j++) {
        gtSamePersonPairs++;
        const a = oids[i], b = oids[j];
        const linked = predSameMap.get(a)?.has(b) ?? false;
        if (linked) idTP++;
        else idFN++;
      }
    }
  }
  // Cross-cluster FP: predicted pairs that are NOT same customer in gt.
  const counted = new Set<string>();
  for (const cluster of linkerResult.clusters) {
    for (let i = 0; i < cluster.order_ids.length; i++) {
      for (let j = i + 1; j < cluster.order_ids.length; j++) {
        const a = cluster.order_ids[i], b = cluster.order_ids[j];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (counted.has(key)) continue;
        counted.add(key);
        const gtA = gt.orders[a]?.customerId;
        const gtB = gt.orders[b]?.customerId;
        if (gtA && gtB && gtA !== gtB) idFP++;
      }
    }
  }
  const idPrecision = idTP + idFP > 0 ? idTP / (idTP + idFP) : 1;
  const idRecall = idTP + idFN > 0 ? idTP / (idTP + idFN) : 1;

  // ── Ring detection ──
  const ringDiag: ScenarioMetrics['rings'] = [];
  for (const ring of gt.rings) {
    const ringOrders = Object.keys(gt.orders).filter((oid) => gt.orders[oid].ringId === ring.ringId);
    let flagged = 0;
    let maxGrade: ConfidenceGrade | 'none' = 'none';
    const gradeRank: Record<string, number> = { none: 0, weak: 1, possible: 2, probable: 3, definite: 4 };
    for (const oid of ringOrders) {
      const s = scoredByOrderId.get(oid);
      if (!s) continue;
      const g = computeConfidenceGrade(s, customerOrderHistory);
      if ((s.flagged && g !== null && g !== 'weak')) flagged++;
      const gk = g ?? 'none';
      if (gradeRank[gk] > gradeRank[maxGrade]) maxGrade = gk as any;
    }
    ringDiag.push({ ringId: ring.ringId, expected_orders: ringOrders.length, flagged_orders: flagged, max_grade: maxGrade, suppressed_expected: ring.suppressed });
  }

  // ── Scenario 106 specifics ──
  let s106CrossSurfaced: number | undefined;
  let s106CrossTotal: number | undefined;
  let s106SingleFlaggedViaCM: number | undefined;
  if (scenarioNum === 106) {
    const cross = gt.rings.filter((r) => !r.suppressed);
    const single = gt.rings.filter((r) => r.suppressed);
    s106CrossTotal = cross.length;
    s106CrossSurfaced = cross.filter((r) => {
      const ringOrders = Object.keys(gt.orders).filter((oid) => gt.orders[oid].ringId === r.ringId);
      const flagged = ringOrders.filter((oid) => {
        const s = scoredByOrderId.get(oid);
        if (!s) return false;
        const g = computeConfidenceGrade(s, customerOrderHistory);
        return s.flagged && g !== null && g !== 'weak';
      }).length;
      return flagged / Math.max(ringOrders.length, 1) >= 0.5;
    }).length;
    // single-source rings should NOT receive crossMerchant signal credit
    s106SingleFlaggedViaCM = 0;
    for (const r of single) {
      const ringOrders = Object.keys(gt.orders).filter((oid) => gt.orders[oid].ringId === r.ringId);
      for (const oid of ringOrders) {
        const s = scoredByOrderId.get(oid);
        if (!s) continue;
        if (s.signals.some((sig) => sig.fired && sig.name === 'crossMerchant')) {
          s106SingleFlaggedViaCM++;
          break;
        }
      }
    }
  }

  // ── Cross-merchant match rate (scenario 5) ──
  let crossMerchantRate: number | undefined;
  if (scenarioNum === 5) {
    const crossMerchantRings = gt.rings.filter((r) => !r.suppressed && r.merchantIds.length >= 3);
    const surfaced = crossMerchantRings.filter((r) => {
      const ringOrders = Object.keys(gt.orders).filter((oid) => gt.orders[oid].ringId === r.ringId);
      const flagged = ringOrders.filter((oid) => {
        const s = scoredByOrderId.get(oid);
        if (!s) return false;
        const g = computeConfidenceGrade(s, customerOrderHistory);
        return s.flagged && g !== null && g !== 'weak';
      }).length;
      return flagged / Math.max(ringOrders.length, 1) >= 0.5; // ≥50% of ring's orders flagged
    }).length;
    crossMerchantRate = crossMerchantRings.length > 0 ? surfaced / crossMerchantRings.length : 0;
  }

  const signalsFailedToFire = ALL_SIGNALS.filter((s) => signalsFired[s] === 0);

  // ── Pass-summary against targets ──
  const passSummary: Record<string, { actual: string; target: string; pass: boolean }> = {};
  passSummary['precision_min_0.80'] = { actual: precision.toFixed(3), target: '≥ 0.80', pass: precision >= 0.80 };
  passSummary['precision_pilot_0.85'] = { actual: precision.toFixed(3), target: '≥ 0.85', pass: precision >= 0.85 };
  passSummary['recall_min_0.60'] = { actual: recall.toFixed(3), target: '≥ 0.60', pass: recall >= 0.60 };
  passSummary['recall_pilot_0.75'] = { actual: recall.toFixed(3), target: '≥ 0.75', pass: recall >= 0.75 };
  passSummary['f1_min_0.70'] = { actual: f1.toFixed(3), target: '≥ 0.70', pass: f1 >= 0.70 };
  passSummary['f1_pilot_0.80'] = { actual: f1.toFixed(3), target: '≥ 0.80', pass: f1 >= 0.80 };
  passSummary['fpr_max_0.05'] = { actual: fpr.toFixed(3), target: '≤ 0.05', pass: fpr <= 0.05 };
  passSummary['identity_precision_min_0.95'] = { actual: idPrecision.toFixed(3), target: '≥ 0.95', pass: idPrecision >= 0.95 };
  passSummary['identity_recall_min_0.99'] = { actual: idRecall.toFixed(3), target: '≥ 0.99', pass: idRecall >= 0.99 };

  if (scenarioNum === 1) passSummary['latency_40_row_10s'] = { actual: `${latency}ms (500 rows)`, target: 'n/a', pass: true };
  if (scenarioNum === 5 && crossMerchantRate !== undefined) {
    passSummary['cross_merchant_match_rate_0.70'] = { actual: crossMerchantRate.toFixed(3), target: '≥ 0.70', pass: crossMerchantRate >= 0.70 };
  }
  if (scenarioNum === 5) {
    const k2Ring = ringDiag.find((r) => r.suppressed_expected);
    if (k2Ring) {
      const suppressed = k2Ring.flagged_orders === 0;
      passSummary['k_anon_2_merchant_ring_suppressed'] = { actual: `${k2Ring.flagged_orders} flagged`, target: '0 flagged', pass: suppressed };
    }
  }
  if (scenarioNum === 8) {
    passSummary['ingestion_10000_under_180s'] = { actual: `${latency}ms`, target: '≤ 180000ms', pass: latency <= 180_000 };
  }
  if (scenarioNum === 4) {
    const reviewRate = (tp + fp) / (tp + fp + tn + fn);
    passSummary['review_rate_under_6pct'] = { actual: (reviewRate * 100).toFixed(2) + '%', target: '≤ 6%', pass: reviewRate <= 0.06 };
  }
  // Cohort FPR pass checks (target = 0)
  const cohortTargets: Record<number, string> = {
    101: 'high_return_legit',
    102: 'burst_legit',
    103: 'gift_legit',
    104: 'wardrobe_legit',
  };
  if (cohortTargets[scenarioNum]) {
    const cohort = cohortTargets[scenarioNum];
    const c = cohortFpr[cohort];
    if (c) {
      passSummary[`cohort_fpr_${cohort}_zero`] = {
        actual: `${c.fp}/${c.n} = ${c.fpr.toFixed(3)}`,
        target: '= 0',
        pass: c.fp === 0,
      };
    }
  }
  if (scenarioNum === 106) {
    const rate = s106CrossTotal && s106CrossTotal > 0 ? (s106CrossSurfaced ?? 0) / s106CrossTotal : 0;
    passSummary['s106_cross_surface_rate_0.75'] = { actual: `${s106CrossSurfaced}/${s106CrossTotal} = ${rate.toFixed(3)}`, target: '≥ 0.75', pass: rate >= 0.75 };
    passSummary['s106_single_rings_no_crossMerchant_credit'] = { actual: `${s106SingleFlaggedViaCM ?? 0} ring(s) got crossMerchant`, target: '= 0', pass: (s106SingleFlaggedViaCM ?? 0) === 0 };
  }

  return {
    scenario: scenarioNum,
    description: gt.description,
    rows_loaded: rows.length,
    rows_skipped: loaded.skipped,
    rows_duplicates_dropped: loaded.duplicates,
    precision, recall, f1, fpr,
    truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn,
    flagged_count: tp + fp,
    fraud_count_gt: Object.values(gt.orders).filter((o) => o.fraudLabel === 'fraud').length,
    legitimate_count_gt: Object.values(gt.orders).filter((o) => o.fraudLabel === 'legitimate').length,
    grade_distribution: gradeDist,
    identity_precision: idPrecision,
    identity_recall: idRecall,
    cluster_count: linkerResult.clusters.length,
    signals_fired_count: signalsFired,
    false_definite_orders: falseDefinite.slice(0, 25),
    signals_failed_to_fire: signalsFailedToFire,
    latency_ms: latency,
    rings: ringDiag,
    cross_merchant_match_rate: crossMerchantRate,
    cohort_fpr: Object.keys(cohortFpr).length > 0 ? cohortFpr : undefined,
    legit_cohort_flags: legitCohortFlags.length > 0 ? legitCohortFlags : undefined,
    missed_fraud: missedFraud.length > 0 ? missedFraud : undefined,
    s106_cross_rings_surfaced: s106CrossSurfaced,
    s106_cross_rings_total: s106CrossTotal,
    s106_single_rings_flagged_via_cross_merchant: s106SingleFlaggedViaCM,
    pass_summary: passSummary,
  };
}

function formatScenarioReport(m: ScenarioMetrics): string {
  const lines: string[] = [];
  lines.push(`\n═══════════════════════════════════════════════════════════════`);
  lines.push(`SCENARIO ${m.scenario}: ${m.description}`);
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push(`Rows: loaded=${m.rows_loaded} skipped=${m.rows_skipped} dup_dropped=${m.rows_duplicates_dropped}`);
  lines.push(`Latency: ${m.latency_ms}ms`);
  lines.push(`\nFraud detection metrics:`);
  lines.push(`  TP=${m.truePositives}  FP=${m.falsePositives}  TN=${m.trueNegatives}  FN=${m.falseNegatives}`);
  lines.push(`  Precision: ${m.precision.toFixed(3)}`);
  lines.push(`  Recall:    ${m.recall.toFixed(3)}`);
  lines.push(`  F1:        ${m.f1.toFixed(3)}`);
  lines.push(`  FPR:       ${m.fpr.toFixed(3)}`);
  lines.push(`\nIdentity resolution:`);
  lines.push(`  Identity precision: ${m.identity_precision.toFixed(3)}`);
  lines.push(`  Identity recall:    ${m.identity_recall.toFixed(3)}`);
  lines.push(`  Linker clusters:    ${m.cluster_count}`);
  lines.push(`\nConfidence grade distribution:`);
  for (const [g, n] of Object.entries(m.grade_distribution)) lines.push(`  ${g.padEnd(10)} ${n}`);
  lines.push(`\nSignal fire counts:`);
  for (const [s, n] of Object.entries(m.signals_fired_count)) lines.push(`  ${s.padEnd(28)} ${n}`);
  if (m.signals_failed_to_fire.length > 0) {
    lines.push(`\nSignals that NEVER fired in this scenario:`);
    for (const s of m.signals_failed_to_fire) lines.push(`  ${s}`);
  }
  if (m.false_definite_orders.length > 0) {
    lines.push(`\nFalse DEFINITE verdicts (${m.false_definite_orders.length}, showing up to 25):`);
    for (const fd of m.false_definite_orders) {
      lines.push(`  ${fd.orderId} score=${fd.score.toFixed(1)} signals=${fd.signals.join(',')}`);
    }
  }
  lines.push(`\nRing detection:`);
  for (const r of m.rings) {
    const ratio = r.expected_orders > 0 ? (r.flagged_orders / r.expected_orders * 100).toFixed(1) + '%' : 'n/a';
    const tag = r.suppressed_expected ? '[k-anon: should NOT surface]' : '';
    lines.push(`  ${r.ringId.padEnd(28)} ${r.flagged_orders}/${r.expected_orders} flagged (${ratio}) max_grade=${r.max_grade} ${tag}`);
  }
  if (m.cross_merchant_match_rate !== undefined) {
    lines.push(`\nCross-merchant ring detection rate: ${(m.cross_merchant_match_rate * 100).toFixed(1)}% (target ≥ 70%)`);
  }
  if (m.cohort_fpr) {
    lines.push(`\nCohort FPR:`);
    for (const [c, v] of Object.entries(m.cohort_fpr)) {
      lines.push(`  ${c.padEnd(24)} fp=${v.fp}/${v.n} fpr=${v.fpr.toFixed(3)}`);
    }
  }
  if (m.legit_cohort_flags && m.legit_cohort_flags.length > 0) {
    lines.push(`\nLegit-cohort flagged at POSSIBLE+ (${m.legit_cohort_flags.length}, showing 25):`);
    for (const f of m.legit_cohort_flags.slice(0, 25)) {
      lines.push(`  ${f.orderId} cohort=${f.cohort} grade=${f.grade} score=${f.score.toFixed(1)} signals=${f.signals.join(',')}`);
    }
  }
  if (m.missed_fraud && m.missed_fraud.length > 0) {
    lines.push(`\nMissed fraud customers (${m.missed_fraud.length}, showing 25):`);
    for (const f of m.missed_fraud.slice(0, 25)) {
      lines.push(`  ${f.customerId} ring=${f.ringId ?? '-'} signals_fired=${f.signals_fired_on_their_orders.join(',') || '(none)'}`);
    }
  }
  if (m.s106_cross_rings_total !== undefined) {
    lines.push(`\nS106 cross-source rings surfaced: ${m.s106_cross_rings_surfaced}/${m.s106_cross_rings_total}`);
    lines.push(`S106 single-source rings that received crossMerchant signal: ${m.s106_single_rings_flagged_via_cross_merchant} (should be 0)`);
  }
  lines.push(`\nBenchmark pass/fail:`);
  for (const [k, v] of Object.entries(m.pass_summary)) {
    const tag = v.pass ? 'PASS' : 'FAIL';
    lines.push(`  [${tag}] ${k.padEnd(36)} actual=${v.actual.padEnd(24)} target=${v.target}`);
  }
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  const which = process.argv[2];
  const scenarios = which ? [parseInt(which, 10)] : [1, 2, 3, 4, 5, 6, 7, 8, 101, 102, 103, 104, 105, 106];
  const allMetrics: ScenarioMetrics[] = [];
  for (const n of scenarios) {
    console.log(`\n[run] scenario ${n}…`);
    try {
      const m = evaluateScenario(n);
      allMetrics.push(m);
      console.log(formatScenarioReport(m));
    } catch (e) {
      console.error(`[run] scenario ${n} ERROR:`, (e as Error).message);
      console.error((e as Error).stack);
    }
  }
  const reportPath = path.join(REPORT_DIR, `blind-stress-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(allMetrics, null, 2));
  console.log(`\n[run] full JSON report → ${reportPath}`);
}

main();
