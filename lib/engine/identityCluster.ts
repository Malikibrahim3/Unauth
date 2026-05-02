/**
 * Identity Clustering Engine — Three-Pass Architecture
 *
 * Pass 1 — Hard entity resolution: group orders by exact normalised email hash.
 *           Confidence 100 by definition. No scoring needed.
 *
 * Pass 2 — Pairwise identity signal comparison: for orders with different email
 *           hashes, build index maps and evaluate candidate pairs using the 8
 *           identity signals. Union-find merges qualifying pairs into clusters.
 *
 * Pass 3 — Behavioral context aggregation: for each cluster with 2+ unique
 *           email hashes (i.e., cross-identity links), aggregate factual stats
 *           and produce MerchantDisplay copy.
 *
 * Output: IdentityClusterResult[] containing only cross-identity clusters.
 *         Same-email multiple-order groups are NOT included — they are normal
 *         customer behaviour, not identity obscuration.
 */

import type {
  NormalisedOrder,
  IdentitySignalResult,
  IdentityClusterResult,
  BehavioralContext,
  MerchantDisplay,
} from './types';
import type { FastScoringContext } from './fastContext';
import { CONFIDENCE_GRADES } from './weights';
import {
  deviceMatch,
  cardMatch,
  emailVariant,
  addressCluster,
  ipCluster,
  nameVariant,
  accountLink,
  phoneMatch,
} from './identitySignals';

// =============================================================================
// TYPES
// =============================================================================

/** A pair that shared an IP address but lacked sufficient corroboration to cluster */
export interface UnconfirmedOverlap {
  orderIdA: string;
  orderIdB: string;
  reason: string;
}

export interface ClusterBatchResult {
  clusters: IdentityClusterResult[];
  unconfirmedOverlaps: UnconfirmedOverlap[];
}

// =============================================================================
// UNION-FIND
// =============================================================================

class UnionFind {
  private parent = new Map<string, string>();

  find(id: string): string {
    if (!this.parent.has(id)) this.parent.set(id, id);
    const p = this.parent.get(id)!;
    if (p !== id) {
      this.parent.set(id, this.find(p)); // path compression
    }
    return this.parent.get(id)!;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }

  getGroups(ids: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const id of ids) {
      const root = this.find(id);
      const g = groups.get(root) ?? [];
      g.push(id);
      groups.set(root, g);
    }
    return groups;
  }
}

// =============================================================================
// DATA COMPLETENESS
// =============================================================================

const IDENTITY_FIELDS = [
  'customer_email',
  'customer_name',
  'shipping_address', // required — always present
  'customer_phone',
  'billing_address',
  'ip_address',
  'device_id',
  'card_fingerprint',
  'card_bin',
  'card_last4',
  'browser_fingerprint',
  'cookie_id',
  'user_agent',
  'asn',
  'account_id',
] as const; // 15 fields total

function computeDataCompleteness(a: NormalisedOrder, b: NormalisedOrder): number {
  const present = new Set<string>();

  // Required
  if (a.emailHash || b.emailHash) present.add('customer_email');
  if (a.customerNameNorm || b.customerNameNorm) present.add('customer_name');
  if (a.addressHash || b.addressHash) present.add('shipping_address');

  // Optional
  if (a.phoneHash || b.phoneHash) present.add('customer_phone');
  if (a.billingAddressHash || b.billingAddressHash) present.add('billing_address');
  if (a.ipHash || b.ipHash) present.add('ip_address');
  if (a.deviceIdHash || b.deviceIdHash) present.add('device_id');
  if (a.cardFingerprint || b.cardFingerprint) present.add('card_fingerprint');
  if (a.cardBin || b.cardBin) present.add('card_bin');
  if (a.cardLast4 || b.cardLast4) present.add('card_last4');
  if (a.browserFingerprint || b.browserFingerprint) present.add('browser_fingerprint');
  if (a.cookieIdHash || b.cookieIdHash) present.add('cookie_id');
  if (a.userAgentHash || b.userAgentHash) present.add('user_agent');
  if (a.asnHash || b.asnHash) present.add('asn');
  if (a.accountIdHash || b.accountIdHash) present.add('account_id');

  return (present.size / IDENTITY_FIELDS.length) * 100;
}

// =============================================================================
// GRADE COMPUTATION WITH CAPS
// =============================================================================

type ConfidenceGrade = 'definite' | 'probable' | 'possible' | 'weak';

function gradeFromScore(score: number): ConfidenceGrade {
  if (score >= CONFIDENCE_GRADES.definite) return 'definite';
  if (score >= CONFIDENCE_GRADES.probable) return 'probable';
  if (score >= CONFIDENCE_GRADES.possible) return 'possible';
  return 'weak';
}

/**
 * Rule 1 — Completeness cap.
 * Prevents high confidence from sparse data.
 */
function applyCompletenessCap(grade: ConfidenceGrade, completeness: number): ConfidenceGrade {
  if (completeness < 30) {
    // Only required fields present — cap at 'possible'
    if (grade === 'definite' || grade === 'probable') return 'possible';
  } else if (completeness < 60) {
    // Some optional fields — cap at 'probable'
    if (grade === 'definite') return 'probable';
  }
  return grade;
}

/**
 * Rule 2 — Minimum corroboration.
 * A single signal is never enough for 'probable' or above, except accountLink.
 */
function applyCorroborationRule(
  grade: ConfidenceGrade,
  firedSignals: IdentitySignalResult[]
): ConfidenceGrade {
  if (firedSignals.length === 1) {
    if (firedSignals[0].signal !== 'accountLink') {
      if (grade === 'definite' || grade === 'probable') return 'possible';
    } else {
      // accountLink alone → max 'probable'
      if (grade === 'definite') return 'probable';
    }
  }
  return grade;
}

// =============================================================================
// BEHAVIORAL CONTEXT
// =============================================================================

function buildBehavioralContext(orders: NormalisedOrder[]): BehavioralContext {
  const totalOrders = orders.length;

  const refundOrders = orders.filter(
    (o) =>
      o.refundStatus === 'full' ||
      o.refundStatus === 'partial' ||
      o.orderStatus === 'refunded'
  );
  const totalRefundClaims = refundOrders.length;
  const refundRate = totalOrders > 0 ? totalRefundClaims / totalOrders : 0;

  const claimDays = refundOrders
    .filter((o) => o.refundDate != null)
    .map(
      (o) =>
        (o.refundDate!.getTime() - o.orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

  const avgDaysToClaimRefund =
    claimDays.length > 0
      ? claimDays.reduce((a, b) => a + b, 0) / claimDays.length
      : null;
  const fastestClaimDays = claimDays.length > 0 ? Math.min(...claimDays) : null;

  const refundReasons = [
    ...new Set(orders.filter((o) => o.refundReason).map((o) => o.refundReason!)),
  ];

  const totals = orders.map((o) => o.orderTotal);
  const orderValueRange = {
    min: Math.min(...totals),
    max: Math.max(...totals),
    avg: totals.reduce((a, b) => a + b, 0) / totals.length,
  };

  const sorted = [...orders].sort(
    (a, b) => a.orderDate.getTime() - b.orderDate.getTime()
  );
  const firstSeen = sorted[0].orderDate.toISOString();
  const lastSeen = sorted[sorted.length - 1].orderDate.toISOString();

  const paymentMethodsUsed = [
    ...new Set(orders.filter((o) => o.paymentMethod).map((o) => o.paymentMethod!)),
  ];

  return {
    totalOrders,
    totalRefundClaims,
    refundRate,
    avgDaysToClaimRefund,
    fastestClaimDays,
    refundReasons,
    orderValueRange,
    firstSeen,
    lastSeen,
    paymentMethodsUsed,
  };
}

// =============================================================================
// MERCHANT DISPLAY COPY
// =============================================================================

const HUMAN_FIELD_NAMES: Record<string, string> = {
  card_fingerprint: 'card fingerprint',
  browser_fingerprint: 'browser fingerprint',
  cookie_id: 'cookie ID',
  device_id: 'device ID',
  card_last4: 'card last 4 digits',
  card_bin: 'card BIN',
  account_id: 'account ID',
  customer_phone: 'phone number',
  ip_address: 'IP address',
  billing_address: 'billing address',
  user_agent: 'user agent',
  asn: 'ASN / network',
};

function buildMerchantDisplay(
  orderCount: number,
  grade: ConfidenceGrade,
  firedSignals: IdentitySignalResult[],
  behavioral: BehavioralContext,
  missingFields: string[]
): MerchantDisplay {
  // Headline — no fraud language for single-merchant results
  const headlines: Record<ConfidenceGrade, string> = {
    definite: `${orderCount} accounts appear to be the same customer`,
    probable: `${orderCount} accounts are probably the same customer`,
    possible: `${orderCount} accounts may be the same customer`,
    weak: `${orderCount} accounts have some identity overlap`,
  };

  const SIGNAL_LABELS: Record<string, string> = {
    deviceMatch: 'same device',
    cardMatch: 'same card',
    emailVariant: 'email pattern match',
    addressCluster: 'same address',
    ipCluster: 'same IP address',
    nameVariant: 'similar name',
    accountLink: 'same account',
    phoneMatch: 'same phone number',
  };

  const matchedOn = firedSignals.map((s) => SIGNAL_LABELS[s.signal] ?? s.signal);
  const confidenceLine =
    matchedOn.length > 0
      ? `Matched on: ${matchedOn.join(', ')}`
      : 'No strong identity signals found';

  // Behavior summary — pure facts, no inference
  let behaviorSummary = `${behavioral.totalOrders} order${behavioral.totalOrders !== 1 ? 's' : ''}`;
  if (behavioral.totalRefundClaims > 0) {
    behaviorSummary += `, ${behavioral.totalRefundClaims} refund claim${behavioral.totalRefundClaims !== 1 ? 's' : ''}`;
    if (behavioral.avgDaysToClaimRefund !== null) {
      behaviorSummary += `, avg ${behavioral.avgDaysToClaimRefund.toFixed(1)} days to claim`;
    }
  } else {
    behaviorSummary += ', no refund claims';
  }

  // Recommended action
  let recommendedAction: MerchantDisplay['recommendedAction'] = 'no_action';
  let actionReason = 'No strong identity signals detected — no action needed.';

  if (grade === 'definite') {
    if (
      behavioral.refundRate > 0.5 ||
      behavioral.totalRefundClaims >= 3
    ) {
      recommendedAction = 'escalate';
      actionReason =
        'High-confidence identity match with elevated refund activity across linked accounts.';
    } else {
      recommendedAction = 'manual_verify';
      actionReason = 'High-confidence identity match across multiple accounts — verify manually.';
    }
  } else if (grade === 'probable') {
    recommendedAction = 'review';
    actionReason = 'Probable identity match — worth reviewing before approving any refund claims.';
  } else if (grade === 'possible') {
    recommendedAction = 'review';
    actionReason =
      'Possible identity match — review if a refund or chargeback is involved.';
  }

  const display: MerchantDisplay = {
    headline: headlines[grade],
    confidenceLine,
    behaviorSummary,
    recommendedAction,
    actionReason,
  };

  if (missingFields.length > 0) {
    const readable = missingFields
      .map((f) => HUMAN_FIELD_NAMES[f] ?? f)
      .join(', ');
    display.dataGapNote = `Confidence could be higher with: ${readable}. Ask your platform provider how to export these fields.`;
  }

  return display;
}

// =============================================================================
// PAIR SIGNAL EVALUATION
// =============================================================================

type OrderWithRaw = NormalisedOrder & { _rawIP?: string | null };

function evaluatePair(
  a: NormalisedOrder,
  b: NormalisedOrder,
  ctx: FastScoringContext
): {
  signals: IdentitySignalResult[];
  firedSignals: IdentitySignalResult[];
  rawScore: number;
  completeness: number;
  grade: ConfidenceGrade;
  ipOnly: boolean;
} {
  // Run first 7 non-IP signals
  const dMatch = deviceMatch(a, b);
  const cMatch = cardMatch(a, b);
  const eVariant = emailVariant(a, b);
  const addrSig = addressCluster(a, b);
  const nVariant = nameVariant(a, b);
  const accLink = accountLink(a, b);
  const pMatch = phoneMatch(a, b);

  const preIpSignals = [dMatch, cMatch, eVariant, addrSig, nVariant, accLink, pMatch];
  const othersFired = preIpSignals.some((s) => s.fired);

  // Lookup IP historical data
  const aWithRaw = a as OrderWithRaw;
  const ipFlaggedCount = aWithRaw._rawIP
    ? (ctx.historicalIPMap.get(aWithRaw._rawIP)?.flagged_count ?? 0)
    : 0;

  const ipSig = ipCluster(a, b, othersFired, ipFlaggedCount);
  const allSignals = [...preIpSignals, ipSig];
  const firedSignals = allSignals.filter((s) => s.fired);

  const rawScore = Math.min(
    100,
    firedSignals.reduce((sum, s) => sum + s.confidence, 0)
  );
  const completeness = computeDataCompleteness(a, b);

  let grade = gradeFromScore(rawScore);
  grade = applyCorroborationRule(grade, firedSignals);
  grade = applyCompletenessCap(grade, completeness);

  // IP-only guard — single IP match gets no cluster, goes to unconfirmed
  const ipOnly =
    firedSignals.length === 1 && firedSignals[0].signal === 'ipCluster';

  return { signals: allSignals, firedSignals, rawScore, completeness, grade, ipOnly };
}

// =============================================================================
// INDEX HELPERS
// =============================================================================

function addToIndex(
  index: Map<string, NormalisedOrder[]>,
  key: string | null | undefined,
  order: NormalisedOrder
): void {
  if (!key) return;
  const arr = index.get(key) ?? [];
  arr.push(order);
  index.set(key, arr);
}

function collectCandidatePairs(
  index: Map<string, NormalisedOrder[]>,
  into: Set<string>
): void {
  for (const group of index.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        // Canonical sort so A:B === B:A
        const [a, b] = [group[i].orderId, group[j].orderId].sort();
        into.add(`${a}:${b}`);
      }
    }
  }
}

// =============================================================================
// MAIN EXPORT — clusterBatch
// =============================================================================

/**
 * Cluster a batch of orders into IdentityClusterResult objects.
 *
 * Only returns clusters that link orders with DIFFERENT email hashes — same-email
 * multiple orders are normal customer behaviour, not identity obscuration.
 */
export function clusterBatch(
  orders: NormalisedOrder[],
  ctx: FastScoringContext
): ClusterBatchResult {
  if (orders.length === 0) return { clusters: [], unconfirmedOverlaps: [] };

  const uf = new UnionFind();
  for (const o of orders) uf.find(o.orderId); // initialise singletons

  const unconfirmedOverlaps: UnconfirmedOverlap[] = [];
  const orderMap = new Map<string, NormalisedOrder>(
    orders.map((o) => [o.orderId, o])
  );

  // ── PASS 1: Hard entity resolution by email hash ──────────────────────────
  const emailGroups = new Map<string, NormalisedOrder[]>();
  for (const o of orders) {
    const g = emailGroups.get(o.emailHash) ?? [];
    g.push(o);
    emailGroups.set(o.emailHash, g);
  }
  for (const group of emailGroups.values()) {
    for (let i = 1; i < group.length; i++) {
      uf.union(group[0].orderId, group[i].orderId);
    }
  }

  // ── PASS 2: Pairwise identity signal comparison ───────────────────────────
  const ipIdx = new Map<string, NormalisedOrder[]>();
  const cardLast4Idx = new Map<string, NormalisedOrder[]>();
  const cardBinLast4Idx = new Map<string, NormalisedOrder[]>();
  const cardFpIdx = new Map<string, NormalisedOrder[]>();
  const addrIdx = new Map<string, NormalisedOrder[]>();
  const phoneIdx = new Map<string, NormalisedOrder[]>();
  const accountIdx = new Map<string, NormalisedOrder[]>();
  const browserIdx = new Map<string, NormalisedOrder[]>();
  const deviceIdx = new Map<string, NormalisedOrder[]>();
  const cookieIdx = new Map<string, NormalisedOrder[]>();

  for (const o of orders) {
    addToIndex(ipIdx, o.ipHash, o);
    addToIndex(cardLast4Idx, o.cardLast4, o);
    addToIndex(cardBinLast4Idx, o.cardBinLast4, o);
    addToIndex(cardFpIdx, o.cardFingerprint, o);
    addToIndex(addrIdx, o.addressHash, o);
    addToIndex(phoneIdx, o.phoneHash, o);
    addToIndex(accountIdx, o.accountIdHash, o);
    addToIndex(browserIdx, o.browserFingerprint, o);
    addToIndex(deviceIdx, o.deviceIdHash, o);
    addToIndex(cookieIdx, o.cookieIdHash, o);
  }

  const candidatePairs = new Set<string>();
  collectCandidatePairs(ipIdx, candidatePairs);
  collectCandidatePairs(cardLast4Idx, candidatePairs);
  collectCandidatePairs(cardBinLast4Idx, candidatePairs);
  collectCandidatePairs(cardFpIdx, candidatePairs);
  collectCandidatePairs(addrIdx, candidatePairs);
  collectCandidatePairs(phoneIdx, candidatePairs);
  collectCandidatePairs(accountIdx, candidatePairs);
  collectCandidatePairs(browserIdx, candidatePairs);
  collectCandidatePairs(deviceIdx, candidatePairs);
  collectCandidatePairs(cookieIdx, candidatePairs);

  for (const pairKey of candidatePairs) {
    const [idA, idB] = pairKey.split(':');
    const a = orderMap.get(idA);
    const b = orderMap.get(idB);
    if (!a || !b) continue;

    // Skip if already in same cluster from Pass 1
    if (uf.find(a.orderId) === uf.find(b.orderId)) continue;

    const { firedSignals, grade, ipOnly } = evaluatePair(a, b, ctx);

    // IP-only guard (Rule 4) — must be checked BEFORE grade threshold
    // A single shared IP is not evidence of the same person regardless of score
    if (ipOnly) {
      unconfirmedOverlaps.push({
        orderIdA: a.orderId,
        orderIdB: b.orderId,
        reason: 'Shared IP address only — insufficient to link accounts',
      });
      continue;
    }

    if (firedSignals.length === 0) continue;
    if (grade === 'weak') continue; // below clustering threshold

    uf.union(a.orderId, b.orderId);
  }

  // ── PASS 3: Build IdentityClusterResult for cross-identity clusters ───────
  const groups = uf.getGroups(orders.map((o) => o.orderId));
  const results: IdentityClusterResult[] = [];

  for (const [root, orderIds] of groups) {
    if (orderIds.length < 2) continue; // skip singletons

    const clusterOrders = orderIds
      .map((id) => orderMap.get(id))
      .filter((o): o is NormalisedOrder => o != null);

    // Only report cross-identity clusters (different emailHashes present)
    const uniqueEmailHashes = new Set(clusterOrders.map((o) => o.emailHash));
    if (uniqueEmailHashes.size < 2) continue;

    // Re-run signals for all pairs to produce canonical signal summary
    const signalMap = new Map<string, IdentitySignalResult>();
    // Track ALL signal results (including unfired) for missing-field collection
    const allSignalResults = new Map<string, IdentitySignalResult>();
    let maxCompleteness = 0;

    for (let i = 0; i < clusterOrders.length; i++) {
      for (let j = i + 1; j < clusterOrders.length; j++) {
        // Skip same-email pairs — they contribute behavioral context, not identity signals
        if (clusterOrders[i].emailHash === clusterOrders[j].emailHash) continue;

        const { signals, firedSignals, completeness } = evaluatePair(
          clusterOrders[i],
          clusterOrders[j],
          ctx
        );
        maxCompleteness = Math.max(maxCompleteness, completeness);

        for (const s of signals) {
          // Track all signals for missing-field transparency
          if (!allSignalResults.has(s.signal) || s.confidence > (allSignalResults.get(s.signal)?.confidence ?? -1)) {
            allSignalResults.set(s.signal, s);
          }
          if (!s.fired) continue;
          const existing = signalMap.get(s.signal);
          if (!existing || s.confidence > existing.confidence) {
            signalMap.set(s.signal, s);
          }
        }

        void firedSignals; // used for logging if needed
      }
    }

    const signals = Array.from(signalMap.values());
    const firedSignals = signals.filter((s) => s.fired);

    const rawScore = Math.min(
      100,
      firedSignals.reduce((sum, s) => sum + s.confidence, 0)
    );

    // Use representative pair (first two different-email orders) for grade caps
    const crossOrders = clusterOrders.filter(
      (o, idx) =>
        idx === 0 ||
        o.emailHash !== clusterOrders.find((x) => x.emailHash !== o.emailHash)?.emailHash
    );
    const repA = crossOrders[0];
    const repB = crossOrders.find((o) => o.emailHash !== repA.emailHash) ?? crossOrders[1];
    const repCompleteness = repB ? computeDataCompleteness(repA, repB) : maxCompleteness;

    let grade = gradeFromScore(rawScore);
    grade = applyCorroborationRule(grade, firedSignals);
    grade = applyCompletenessCap(grade, repCompleteness);

    const behavioral = buildBehavioralContext(clusterOrders);

    const allMissingFields = [
      ...new Set(Array.from(allSignalResults.values()).flatMap((s) => s.dataPointsMissing)),
    ];

    const display = buildMerchantDisplay(
      clusterOrders.length,
      grade,
      firedSignals,
      behavioral,
      allMissingFields
    );

    results.push({
      clusterId: root,
      orderIds,
      identityConfidence: rawScore,
      confidenceGrade: grade,
      signals,
      dataCompleteness: repCompleteness,
      behavioralContext: behavioral,
      merchantDisplay: display,
    });
  }

  return { clusters: results, unconfirmedOverlaps };
}
