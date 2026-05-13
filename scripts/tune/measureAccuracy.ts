/**
 * measureAccuracy.ts — Phase 3
 *
 * Pair-based accuracy measurement against ground truth.
 * All operations are O(n) in the number of orders — no pair enumeration.
 *
 * Approach:
 *   1. Build a Map<orderId, canonicalId> from ground truth (O(total orders))
 *   2. Build a Map<profileId, Set<canonicalId>> from engine output (O(total orders))
 *   3. Build a Map<canonicalId, Set<profileId>> from engine output (O(total orders))
 *   4. For each canonical customer with k orders:
 *       positive pairs = k*(k-1)/2
 *       TP = sum over profiles: pairs within that profile from this customer
 *       FN = positive pairs − TP
 *   5. For each profile that contains orders from n > 1 canonical customers:
 *       FP pairs += n*(n-1)/2  (cross-customer merges within one profile)
 *   6. FP from FalsePositiveTrap groups: check if any two orders share a profile
 *
 * No quadratic loops anywhere.
 */

import type {
  GroundTruth,
  AccuracyResult,
  AggregateAccuracy,
  TuneConfig,
  FailureDetail,
  SignalType,
  SyntheticOrder,
} from './types';
import type { LocalLinkedPair } from './localLinker';

interface AccuracyDiagnostics {
  orders?: SyntheticOrder[];
  linkedPairs?: LocalLinkedPair[];
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const local = lower.slice(0, at).split('+')[0].replace(/\./g, '');
  return local ? `${local}@${lower.slice(at + 1)}` : null;
}

function emailUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const at = raw.toLowerCase().indexOf('@');
  if (at < 1) return null;
  const alpha = raw.toLowerCase().slice(0, at).replace(/[^a-z]/g, '');
  return alpha.length >= 4 ? alpha : null;
}

function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (digits.startsWith('44') && digits.length === 12) return digits;
  if (digits.startsWith('0044') && digits.length === 14) return digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) return `44${digits.slice(1)}`;
  return digits;
}

function normaliseAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort();
  return tokens.length ? tokens.join(' ') : null;
}

function normaliseName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.toLowerCase().replace(/[^a-z\s,]/g, ' ').replace(/\s+/g, ' ').replace(/,/g, '').trim() || null;
}

function ipSubnet(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  return m ? m[1] : null;
}

function evidenceToSignal(evidence: string[]): SignalType | undefined {
  const priority: Array<[string, SignalType]> = [
    ['email:exact', 'email_exact'],
    ['card:fingerprint', 'card_fingerprint'],
    ['phone:exact', 'phone_exact'],
    ['device:exact', 'device_exact'],
    ['account:exact', 'account_exact'],
    ['card:full', 'card_full'],
    ['card:last4', 'card_last4'],
    ['shipping_address:exact', 'address_exact'],
    ['billing_address:exact', 'address_exact'],
    ['shipping_address:partial', 'address_partial'],
    ['billing_address:partial', 'address_partial'],
    ['billing_address:cross', 'address_partial'],
    ['email:username', 'email_variant'],
    ['phone:partial', 'phone_partial'],
    ['ip:exact', 'ip_exact'],
    ['ip:subnet', 'ip_subnet'],
    ['name:exact', 'name_exact'],
    ['name:fuzzy', 'name_fuzzy'],
  ];
  for (const [needle, signal] of priority) {
    if (evidence.includes(needle)) return signal;
  }
  return undefined;
}

function buildLinkedSignalMap(linkedPairs: LocalLinkedPair[] | undefined): Map<string, SignalType> {
  const out = new Map<string, SignalType>();
  for (const pair of linkedPairs ?? []) {
    const signal = evidenceToSignal(pair.evidence);
    if (signal) out.set(pairKey(pair.a, pair.b), signal);
  }
  return out;
}

function inferSharedSignal(
  a: SyntheticOrder | undefined,
  b: SyntheticOrder | undefined,
): SignalType | undefined {
  if (!a || !b) return undefined;

  const emailA = normaliseEmail(a.customer_email);
  const emailB = normaliseEmail(b.customer_email);
  if (emailA && emailA === emailB) return 'email_exact';

  if (a.card_fingerprint && b.card_fingerprint && a.card_fingerprint === b.card_fingerprint) return 'card_fingerprint';
  if (a.phone && b.phone && normalisePhone(a.phone) === normalisePhone(b.phone)) return 'phone_exact';
  if (a.device_fingerprint && b.device_fingerprint && a.device_fingerprint === b.device_fingerprint) return 'device_exact';
  if (a.account_id && b.account_id && a.account_id === b.account_id) return 'account_exact';

  if (a.card_bin && b.card_bin && a.card_last4 && b.card_last4 && a.card_bin === b.card_bin && a.card_last4 === b.card_last4) return 'card_full';
  if (a.card_last4 && b.card_last4 && a.card_last4 === b.card_last4) return 'card_last4';

  const shipA = normaliseAddress(a.shipping_address);
  const shipB = normaliseAddress(b.shipping_address);
  const billA = normaliseAddress(a.billing_address);
  const billB = normaliseAddress(b.billing_address);
  if ((shipA && shipA === shipB) || (billA && billA === billB)) return 'address_exact';

  const userA = emailUsername(a.customer_email);
  const userB = emailUsername(b.customer_email);
  if (userA && userA === userB && emailA !== emailB) return 'email_variant';

  const phoneA = normalisePhone(a.phone);
  const phoneB = normalisePhone(b.phone);
  if (phoneA && phoneB && phoneA.slice(-7) === phoneB.slice(-7)) return 'phone_partial';

  if (a.device_ip && b.device_ip && a.device_ip === b.device_ip) return 'ip_exact';
  const subnetA = ipSubnet(a.device_ip);
  const subnetB = ipSubnet(b.device_ip);
  if (subnetA && subnetA === subnetB) return 'ip_subnet';

  const nameA = normaliseName(a.customer_name);
  const nameB = normaliseName(b.customer_name);
  if (nameA && nameA === nameB) return 'name_exact';

  return undefined;
}

// ---------------------------------------------------------------------------
// Single-dataset accuracy — O(n)
// ---------------------------------------------------------------------------

export function measureAccuracy(
  gt: GroundTruth,
  orderToProfile: Map<string, string>,
  totalOrders: number,
  diagnostics: AccuracyDiagnostics = {},
): AccuracyResult {
  const orderById = new Map((diagnostics.orders ?? []).map((o) => [o.order_id, o]));
  const linkedSignalByPair = buildLinkedSignalMap(diagnostics.linkedPairs);

  function confusingSignalFor(oidA: string, oidB: string): SignalType | undefined {
    return linkedSignalByPair.get(pairKey(oidA, oidB)) ?? inferSharedSignal(orderById.get(oidA), orderById.get(oidB));
  }

  // --- Step 1: orderId → canonicalId (from ground truth) ---
  const orderToCanonical = new Map<string, string>();
  for (const customer of gt.canonicalCustomers) {
    for (const oid of customer.orderIds) {
      orderToCanonical.set(oid, customer.id);
    }
  }

  // --- Step 2: profileId → Map<canonicalId, count> ---
  const profileCanonicalCount = new Map<string, Map<string, number>>();
  for (const [oid, pid] of orderToProfile) {
    const canonId = orderToCanonical.get(oid);
    if (canonId === undefined) continue; // genuinely new order
    let inner = profileCanonicalCount.get(pid);
    if (!inner) { inner = new Map(); profileCanonicalCount.set(pid, inner); }
    inner.set(canonId, (inner.get(canonId) ?? 0) + 1);
  }

  // --- Step 3: canonicalId → Map<profileId, count> ---
  const canonicalProfileCount = new Map<string, Map<string, number>>();
  for (const [pid, inner] of profileCanonicalCount) {
    for (const [canonId, cnt] of inner) {
      let outer = canonicalProfileCount.get(canonId);
      if (!outer) { outer = new Map(); canonicalProfileCount.set(canonId, outer); }
      outer.set(pid, (outer.get(pid) ?? 0) + cnt);
    }
  }

  // --- Step 4: TP / FN per canonical customer ---
  let tp = 0, fn = 0;
  const fnDetails: FailureDetail[] = [];

  for (const customer of gt.canonicalCustomers) {
    const k = customer.orderIds.length;
    if (k < 2) continue;

    const totalPositivePairs = (k * (k - 1)) / 2;

    // Count pairs that ended up in the same profile
    const profileMap = canonicalProfileCount.get(customer.id);
    let tpForCustomer = 0;
    if (profileMap) {
      for (const cnt of profileMap.values()) {
        if (cnt >= 2) tpForCustomer += (cnt * (cnt - 1)) / 2;
      }
    }

    const fnForCustomer = totalPositivePairs - tpForCustomer;
    tp += tpForCustomer;
    fn += fnForCustomer;

    // Collect a few FN examples for diagnosis
    if (fnForCustomer > 0 && fnDetails.length < 200) {
      // Find two orders in different profiles
      const profileMap2 = canonicalProfileCount.get(customer.id);
      if (profileMap2 && profileMap2.size >= 2) {
        const pids = Array.from(profileMap2.keys());
        // Find one order from pids[0] and one from pids[1]
        let oidA: string | undefined, oidB: string | undefined;
        for (const oid of customer.orderIds) {
          const pid = orderToProfile.get(oid);
          if (!oidA && pid === pids[0]) oidA = oid;
          else if (!oidB && pid === pids[1]) oidB = oid;
          if (oidA && oidB) break;
        }
        if (oidA && oidB) {
          fnDetails.push({
            orderId_a:           oidA,
            orderId_b:           oidB,
            type:                'false_negative',
            missedSignals:       customer.availableSignals,
            canonicalId_a:       customer.id,
            canonicalId_b:       customer.id,
            assignedProfileId_a: orderToProfile.get(oidA) ?? 'MISSING',
            assignedProfileId_b: orderToProfile.get(oidB) ?? 'MISSING',
          });
        }
      }
    }
  }

  // --- Step 5: FP from cross-customer profile merges ---
  let fp = 0;
  const fpDetails: FailureDetail[] = [];

  // Build profileId → list of (orderId, canonicalId) for FP example lookup
  const profileOrders = new Map<string, Array<{ oid: string; canonId: string }>>();
  for (const [oid, pid] of orderToProfile) {
    const canonId = orderToCanonical.get(oid);
    if (canonId === undefined) continue;
    let arr = profileOrders.get(pid);
    if (!arr) { arr = []; profileOrders.set(pid, arr); }
    arr.push({ oid, canonId });
  }

  for (const [pid, inner] of profileCanonicalCount) {
    if (inner.size < 2) continue;
    let seenOrders = 0;
    for (const cnt of inner.values()) {
      fp += seenOrders * cnt;
      seenOrders += cnt;
    }

    if (fpDetails.length < 200) {
      const orders = profileOrders.get(pid) ?? [];
      const canonIds = Array.from(inner.keys());
      outer:
      for (let i = 0; i < canonIds.length; i++) {
        for (let j = i + 1; j < canonIds.length; j++) {
          const oidA = orders.find(o => o.canonId === canonIds[i])?.oid;
          const oidB = orders.find(o => o.canonId === canonIds[j])?.oid;
          if (oidA && oidB) {
            fpDetails.push({
              orderId_a:           oidA,
              orderId_b:           oidB,
              type:                'false_positive',
              confusingSignal:     confusingSignalFor(oidA, oidB),
              canonicalId_a:       canonIds[i],
              canonicalId_b:       canonIds[j],
              assignedProfileId_a: pid,
              assignedProfileId_b: pid,
            });
          }
          if (fpDetails.length >= 200) break outer;
        }
      }
    }
  }

  // --- Step 6: FP from FalsePositiveTrap groups ---
  for (const trap of gt.falsePositiveTraps) {
    const { orderIds, sharedSignal } = trap;
    // Collect profile IDs for each order in the trap
    const pidSet = new Set<string>();
    const oidByPid = new Map<string, string>();
    for (const oid of orderIds) {
      const pid = orderToProfile.get(oid);
      if (pid !== undefined) {
        if (pidSet.has(pid)) {
          // Two orders from this trap are in the same profile = FP
          fp++;
          if (fpDetails.length < 200) {
            fpDetails.push({
              orderId_a:           oidByPid.get(pid)!,
              orderId_b:           oid,
              type:                'false_positive',
              confusingSignal:     confusingSignalFor(oidByPid.get(pid)!, oid) ?? sharedSignal,
              canonicalId_a:       orderToCanonical.get(oidByPid.get(pid)!),
              canonicalId_b:       orderToCanonical.get(oid),
              assignedProfileId_a: pid,
              assignedProfileId_b: pid,
            });
          }
        } else {
          pidSet.add(pid);
          oidByPid.set(pid, oid);
        }
      }
    }
  }

  // --- Derive metrics ---
  const truePairs  = tp + fn;
  const totalPairs = (totalOrders * (totalOrders - 1)) / 2;
  const falsePairs = Math.max(0, totalPairs - truePairs);
  const tn         = Math.max(0, falsePairs - fp);

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1.0;
  const recall    = tp + fn > 0 ? tp / (tp + fn) : 1.0;
  const f1        = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0.0;

  return {
    datasetId:       gt.datasetId,
    totalOrders,
    truePairs,
    falsePairs,
    truePositives:   tp,
    falsePositives:  fp,
    falseNegatives:  fn,
    trueNegatives:   tn,
    precision,
    recall,
    f1,
    fpDetails,
    fnDetails,
  };
}

// ---------------------------------------------------------------------------
// Aggregate across multiple datasets
// ---------------------------------------------------------------------------

export function aggregateAccuracy(
  results: AccuracyResult[],
  iteration: number,
  config: TuneConfig,
): AggregateAccuracy {
  const totalTP = results.reduce((a, r) => a + r.truePositives, 0);
  const totalFP = results.reduce((a, r) => a + r.falsePositives, 0);
  const totalFN = results.reduce((a, r) => a + r.falseNegatives, 0);
  const totalTN = results.reduce((a, r) => a + r.trueNegatives, 0);

  const overallPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 1.0;
  const overallRecall    = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 1.0;
  const overallF1        = overallPrecision + overallRecall > 0
    ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall)
    : 0.0;

  return {
    iterationId:      iteration,
    config,
    perDataset:       results,
    overallPrecision,
    overallRecall,
    overallF1,
    totalTP,
    totalFP,
    totalFN,
    totalTN,
  };
}
