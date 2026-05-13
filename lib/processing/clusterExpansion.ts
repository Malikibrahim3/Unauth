/**
 * Second-stage cluster expansion — identity evidence only.
 *
 * The core linker (linkIdentities) uses conservative thresholds to keep
 * false-positive rates near zero. This module adds a cautious identity-only
 * graph-expansion step that only uses identity data points to expand clusters.
 *
 * PRODUCT CONTRACT:
 *   Refund / dispute / chargeback context MUST NOT influence whether a row
 *   is added to a cluster or whether a candidate group is promoted.
 *   Behaviour is merchant decision support only.
 *
 * Two expansion paths are implemented:
 *
 * Phase 1 — Candidate-group promotion (identity-only gate)
 *   Orders sharing a STRONG signal (card, phone, account, device, email) at
 *   candidate-pair score (15–29) are promoted when ≥ 2 orders share that
 *   signal. No behaviour check.
 *
 * Phase 2 — Identity-signal expansion from existing seed clusters
 *   An external row with ≥ 1 strong signal against the cluster is added as
 *   candidate/probable. An external row with ≥ 2 strong signals (or
 *   1 strong + 1 medium) is added as probable/confirmed.
 *   Behaviour is never consulted.
 *
 * Safety rules enforced in both phases:
 *   - A single soft signal (ip alone, postcode alone) NEVER creates or expands
 *     a cluster.
 *   - Rows connecting only via corporate/busy IP (≥ 5 distinct orders) are blocked.
 *   - Rows connecting only through shared household surname+postcode are blocked.
 *   - Blank / null / placeholder fields never count as matches.
 *   - name + postcode alone NEVER produces a cluster entry.
 *   - BIN+last4 + postcode alone NEVER produces a cluster entry (no second anchor).
 */

import { createHash } from 'node:crypto';
import {
  deterministicClusterId,
  normaliseCard,
  normaliseEmail,
  normalisePhone,
  normalisePostcode,
  normaliseAddressFull,
  addressTokenOverlap,
  normaliseName,
  levenshtein,
  type CandidatePair,
  type LinkedCluster,
  type LinkerOrderInput,
  type LinkerSignal,
} from '../linker';
import { hasValue } from './signals';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Linker signals that are "strong" for expansion purposes (per spec). */
const STRONG_SIGNALS = new Set<LinkerSignal>(['phone', 'device', 'account', 'email', 'card']);

/** Linker signals that are "medium" for expansion purposes (per spec). */
const MEDIUM_SIGNALS = new Set<LinkerSignal>(['ip', 'postcode']);

/**
 * How many distinct order IDs must share an IP before we treat it as a
 * "busy corporate / shared network" and suppress ip-based expansion.
 */
const CORPORATE_IP_THRESHOLD = 5;

/**
 * Minimum number of suspicious-behaviour rows in a candidate-only group
 * before we promote it to a seed cluster.
 */
const MIN_SUSPICIOUS_IN_CANDIDATE_GROUP = 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Behaviour flags retained for API compatibility.
 * NOTE: These fields are NO LONGER used by expansion logic.
 * They are kept here only so existing worker.ts call sites do not need
 * changes before a follow-up cleanup PR.
 * @deprecated Pass an empty Map — expansion ignores behaviour flags.
 */
export interface RowBehaviourFlags {
  order_id: string;
  refund_requested: boolean;
  chargeback_filed: boolean;
  order_total: number;
}

/** Debug output for a newly expanded/promoted order. */
export interface MissedOrderDebugReport {
  missed_order_id: string;
  nearest_cluster_id: string | null;
  candidate_edges: string[];
  reason_not_flagged_before: string[];
  recommended_fix: string | null;
}

/** Return value of expandSuspiciousClusters(). */
export interface ClusterExpansionResult {
  /**
   * Map of order_id → cluster_id for rows that were added through expansion.
   * Does NOT include rows already present in the original linked clusters.
   */
  additionalClusterAssignments: Map<string, string>;
  /**
   * Newly minted clusters promoted from candidate-only groups (Phase 1).
   * These did not exist in the original linker output.
   */
  promotedClusters: LinkedCluster[];
  /** One debug entry for every newly included order. */
  debugReports: MissedOrderDebugReport[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalise a card to its BIN-last4 fingerprint string, or null. */
function cardKey(row: LinkerOrderInput): string | null {
  return normaliseCard(row.card_last4 ?? null, row.card_bin ?? null, row.card_fingerprint ?? null);
}

/** Normalise an IP to trimmed string, or null if blank/placeholder. */
function ipKey(row: LinkerOrderInput): string | null {
  if (!hasValue(row.ip)) return null;
  return row.ip!.trim();
}

/** Normalise a postcode to uppercase-no-space, or null if blank/placeholder. */
function postcodeKey(row: LinkerOrderInput): string | null {
  if (!hasValue(row.postcode)) return null;
  return normalisePostcode(row.postcode);
}

/**
 * Returns true when a row's ONLY connection to the seed cluster is a single
 * soft signal (ip alone, or postcode alone). Two soft signals together (ip +
 * postcode) do NOT trigger this block.
 */
function isOnlySingleSoftSignal(
  strongCount: number,
  mediumCount: number,
): boolean {
  return strongCount === 0 && mediumCount <= 1;
}

/**
 * Heuristic: detect likely shared-household scenario.
 * Returns true when all connecting signals are address/postcode-based AND the
 * candidate's surname matches a cluster member surname.
 *
 * We deliberately keep this lightweight — if uncertain, we do NOT block
 * (false negatives are cheaper than false positives in this guard).
 */
function isLikelySharedHousehold(
  candidateName: string | undefined,
  clusterNames: string[],
  sharedSignals: LinkerSignal[],
): boolean {
  // Only applies when the connection is postcode-only (no ip, no hard signal)
  const hasStrongOrIp = sharedSignals.some((s) => STRONG_SIGNALS.has(s) || s === 'ip');
  if (hasStrongOrIp) return false;

  if (!candidateName) return false;
  const candidateSurname = candidateName.trim().split(/\s+/).pop()?.toLowerCase() ?? '';
  if (!candidateSurname) return false;

  return clusterNames.some((name) => {
    const clusterSurname = name.trim().split(/\s+/).pop()?.toLowerCase() ?? '';
    return clusterSurname === candidateSurname;
  });
}

/**
 * Build per-signal shared counts between a candidate row and a set of
 * cluster rows (using the normalised keys, not raw linker scores).
 */
function countSharedSignals(
  candidate: LinkerOrderInput,
  clusterRows: LinkerOrderInput[],
): { strong: LinkerSignal[]; medium: LinkerSignal[] } {
  const strong: LinkerSignal[] = [];
  const medium: LinkerSignal[] = [];

  // ── card ─────────────────────────────────────────────────────────────────
  const candCard = cardKey(candidate);
  if (candCard && clusterRows.some((r) => cardKey(r) === candCard)) {
    strong.push('card');
  }

  // ── phone ─────────────────────────────────────────────────────────────────
  if (hasValue(candidate.phone)) {
    const candPhone = normalisePhone(candidate.phone);
    if (candPhone && clusterRows.some((r) => hasValue(r.phone) && normalisePhone(r.phone) === candPhone)) {
      strong.push('phone');
    }
  }

  // ── device ────────────────────────────────────────────────────────────────
  if (hasValue(candidate.device_fingerprint)) {
    const dev = candidate.device_fingerprint!.trim();
    if (dev && clusterRows.some((r) => hasValue(r.device_fingerprint) && r.device_fingerprint!.trim() === dev)) {
      strong.push('device');
    }
  }

  // ── account ───────────────────────────────────────────────────────────────
  if (hasValue(candidate.account_id)) {
    const acc = candidate.account_id!.trim();
    if (acc && clusterRows.some((r) => hasValue(r.account_id) && r.account_id!.trim() === acc)) {
      strong.push('account');
    }
  }

  // ── email ─────────────────────────────────────────────────────────────────
  if (hasValue(candidate.email)) {
    const candEmail = normaliseEmail(candidate.email);
    if (candEmail && clusterRows.some((r) => hasValue(r.email) && normaliseEmail(r.email) === candEmail)) {
      strong.push('email');
    }
  }

  // ── ip ────────────────────────────────────────────────────────────────────
  const candIp = ipKey(candidate);
  if (candIp && clusterRows.some((r) => ipKey(r) === candIp)) {
    medium.push('ip');
  }

  // ── postcode ──────────────────────────────────────────────────────────────
  const candPostcode = postcodeKey(candidate);
  if (candPostcode && clusterRows.some((r) => postcodeKey(r) === candPostcode)) {
    medium.push('postcode');
  }

  return { strong, medium };
}

function hasAddressNearMatch(
  candidate: LinkerOrderInput,
  clusterRows: LinkerOrderInput[],
): boolean {
  const cand = normaliseAddressFull(candidate.shipping_address ?? candidate.address ?? null);
  if (!cand) return false;
  return clusterRows.some((row) => {
    const other = normaliseAddressFull(row.shipping_address ?? row.address ?? null);
    return !!other && (other === cand || addressTokenOverlap(cand, other) >= 0.6);
  });
}

function surnameAndInitial(name: string): { surname: string; initial: string } | null {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  const surname = tokens[tokens.length - 1];
  const initial = tokens[0][0] ?? '';
  if (!surname || !initial) return null;
  return { surname, initial };
}

function isNameVariant(a: string, b: string): boolean {
  if (a === b) return true;
  if (levenshtein(a, b) <= 2) return true;
  const aa = surnameAndInitial(a);
  const bb = surnameAndInitial(b);
  return !!aa && !!bb && aa.surname === bb.surname && aa.initial === bb.initial;
}

function hasNameVariantMatch(
  candidateName: string | undefined,
  clusterNames: string[],
): boolean {
  const cand = normaliseName(candidateName ?? null);
  if (!cand) return false;
  return clusterNames.some((name) => {
    const other = normaliseName(name);
    return !!other && isNameVariant(cand, other);
  });
}

// ---------------------------------------------------------------------------
// Phase 1 — Candidate-group promotion
// ---------------------------------------------------------------------------

/**
 * Find groups of orders that are connected solely through candidate pairs
 * (score 15–29) that include at least one STRONG signal, but do NOT meet
 * the linker's LINK_THRESHOLD and therefore never form a seed cluster.
 *
 * Promotes such a group to a LinkedCluster when:
 *   - Every pair in the group shares a STRONG linker signal.
 *   - The group has ≥ 2 members.
 *   - The group is not already covered by an existing linked cluster.
 *   NOTE: Behaviour flags are deliberately NOT consulted (product contract).
 */
function promoteCandidateGroups(
  candidatePairs: CandidatePair[],
  existingClusterOrderIds: Set<string>,
  _behaviourMap: Map<string, RowBehaviourFlags>,
): { clusters: LinkedCluster[]; reports: MissedOrderDebugReport[] } {
  // Filter to pairs that have at least one STRONG signal
  const strongCandidatePairs = candidatePairs.filter((p) =>
    p.signals.some((s) => STRONG_SIGNALS.has(s)),
  );

  if (strongCandidatePairs.length === 0) return { clusters: [], reports: [] };

  // Union-find over strong candidate pairs (ignoring already-linked orders)
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let p = parent.get(x)!;
    while (p !== parent.get(p)!) {
      const gp = parent.get(p)!;
      parent.set(p, parent.get(gp)!);
      p = parent.get(p)!;
    }
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (ra < rb) parent.set(rb, ra);
    else parent.set(ra, rb);
  };

  for (const p of strongCandidatePairs) {
    union(p.order_id_a, p.order_id_b);
  }

  // Group pairs by root
  const components = new Map<string, Set<string>>();
  const componentSignals = new Map<string, Set<LinkerSignal>>();
  const componentPairScores = new Map<string, number[]>();

  for (const p of strongCandidatePairs) {
    const root = find(p.order_id_a);
    if (!components.has(root)) {
      components.set(root, new Set());
      componentSignals.set(root, new Set());
      componentPairScores.set(root, []);
    }
    components.get(root)!.add(p.order_id_a);
    components.get(root)!.add(p.order_id_b);
    for (const s of p.signals) componentSignals.get(root)!.add(s);
    componentPairScores.get(root)!.push(p.score);
  }

  const promoted: LinkedCluster[] = [];
  const reports: MissedOrderDebugReport[] = [];

  for (const [root, members] of Array.from(components.entries())) {
    const orderIds = Array.from(members);

    // Skip if any member is already in a linked cluster — the seed already
    // exists; Phase 2 will handle expansion if needed.
    if (orderIds.some((id) => existingClusterOrderIds.has(id))) continue;

    // Require at least 2 members (at minimum, pairs of orders)
    if (orderIds.length < 2) continue;

    // Require at least one STRONG signal across ALL pairs in the component.
    // Behaviour flags are NOT checked — product contract forbids it.
    const sigs = componentSignals.get(root)!;
    const hasStrong = Array.from(sigs).some((s) => STRONG_SIGNALS.has(s));
    if (!hasStrong) continue;

    const clusterId = deterministicClusterId(orderIds);
    const maxScore = Math.max(...(componentPairScores.get(root) ?? [0]));
    const signalsSorted = Array.from(sigs).sort();

    promoted.push({
      cluster_id: clusterId,
      order_ids: orderIds.sort(),
      confidence_score: maxScore,
      signals_matched: signalsSorted as LinkerSignal[],
      evidence_summary: [],
    });

    // Generate debug reports for each member
    for (const orderId of orderIds) {
      const peers = orderIds.filter((id) => id !== orderId);
      const edges = strongCandidatePairs
        .filter((p) => (p.order_id_a === orderId || p.order_id_b === orderId))
        .map((p) => {
          const peer = p.order_id_a === orderId ? p.order_id_b : p.order_id_a;
          return `matched ${peer} on ${p.signals.join('+')} (score=${p.score})`;
        });

      reports.push({
        missed_order_id: orderId,
        nearest_cluster_id: clusterId,
        candidate_edges: edges,
        reason_not_flagged_before: [
          `All pairs scored ${Math.max(...(componentPairScores.get(root) ?? [0]))} ` +
          `(below LINK_THRESHOLD=30); shared signals were candidate-only`,
        ],
        recommended_fix:
          `Promoted to cluster (identity evidence): ` +
          `strong signal(s) present (${signalsSorted.join(', ')}), ${orderIds.length} members`,
      });
    }
  }

  return { clusters: promoted, reports };
}

// ---------------------------------------------------------------------------
// Phase 2 — Soft-signal expansion from seed clusters
// ---------------------------------------------------------------------------

/**
 * For each existing linked cluster, find external rows that share ≥2 medium
 * signals (ip + postcode) with cluster members AND show suspicious behaviour,
 * then add them to the cluster (subject to false-positive guards).
 *
 * This handles the case where the linker dropped ip+postcode-only pairs
 * (score=0 because both are soft signals).
 */
function expandFromSeedClusters(
  linkedClusters: LinkedCluster[],
  allInputs: LinkerOrderInput[],
  _behaviourMap: Map<string, RowBehaviourFlags>,
  candidateNames: Map<string, string>, // order_id → customer_name
): { assignments: Map<string, string>; reports: MissedOrderDebugReport[] } {
  const assignments = new Map<string, string>();
  const reports: MissedOrderDebugReport[] = [];

  // Build a set of all order_ids already in a linked cluster
  const inCluster = new Set<string>(linkedClusters.flatMap((c) => c.order_ids));

  // Build ip usage count — to detect corporate/shared IPs
  const ipUsageCount = new Map<string, number>();
  for (const row of allInputs) {
    const ip = ipKey(row);
    if (ip) ipUsageCount.set(ip, (ipUsageCount.get(ip) ?? 0) + 1);
  }

  // Build lookup: order_id → LinkerOrderInput
  const inputById = new Map(allInputs.map((r) => [r.order_id, r]));

  for (const cluster of linkedClusters) {
    const clusterInputs = cluster.order_ids
      .map((id) => inputById.get(id))
      .filter((r): r is LinkerOrderInput => r !== undefined);

    const clusterNames = cluster.order_ids
      .map((id) => candidateNames.get(id) ?? '')
      .filter(Boolean);

    // External rows = those NOT in any cluster
    for (const candidateRow of allInputs) {
      const candId = candidateRow.order_id;
      if (inCluster.has(candId)) continue;
      if (assignments.has(candId)) continue; // already assigned by a prior cluster

      const { strong, medium } = countSharedSignals(candidateRow, clusterInputs);
      const sharedAddress = hasAddressNearMatch(candidateRow, clusterInputs);
      const candName = candidateNames.get(candId);
      const sharedNameVariant = hasNameVariantMatch(candName, clusterNames);

      // Identity-only expansion gate (product contract: no behaviour flags).
      //   ≥2 strong signals                     → merge (probable/confirmed)
      //   1 strong + ≥1 medium                  → merge (probable)
      //   1 strong alone                         → candidate only; skip merge
      //   medium-only or corroborator-only       → no merge
      //   name+postcode, IP+postcode, BIN+postcode → no merge
      const addressVariantPromotion =
        strong.length === 0 &&
        medium.includes('postcode') &&
        sharedAddress &&
        sharedNameVariant;
      const safeToAdd =
        strong.length >= 2 ||
        (strong.length >= 1 && medium.length >= 1) ||
        addressVariantPromotion;

      if (!safeToAdd) continue;

      // ── False-positive guards ─────────────────────────────────────────────

      // Guard 1: single soft signal only
      if (isOnlySingleSoftSignal(strong.length, medium.length)) continue;

      // Guard 2: corporate / busy IP
      const candIp = ipKey(candidateRow);
      if (
        strong.length === 0 &&
        medium.includes('ip') &&
        !medium.includes('postcode') &&
        candIp &&
        (ipUsageCount.get(candIp) ?? 0) >= CORPORATE_IP_THRESHOLD
      ) {
        continue;
      }

      // Guard 3: likely shared household (postcode-only connection + same surname)
      const allSharedSignals = [...strong, ...medium];
      if (isLikelySharedHousehold(candName, clusterNames, allSharedSignals)) {
        continue;
      }

      assignments.set(candId, cluster.cluster_id);

      // Debug report
      const candidateEdges = clusterInputs.map((clusterRow) => {
        const { strong: s, medium: m } = countSharedSignals(candidateRow, [clusterRow]);
        if (s.length + m.length === 0) return null;
        return `matched ${clusterRow.order_id} on ${[...s, ...m].join('+')}`;
      }).filter(Boolean) as string[];

      reports.push({
        missed_order_id: candId,
        nearest_cluster_id: cluster.cluster_id,
        candidate_edges: candidateEdges,
        reason_not_flagged_before: [
          `score below LINK_THRESHOLD; soft-signal connections dropped by linker`,
        ],
        recommended_fix:
          `Expanded into cluster (identity evidence): ` +
          `${strong.length} strong signal(s) (${strong.join(', ')})` +
          (medium.length > 0 ? ` + ${medium.length} medium signal(s) (${medium.join(', ')})` : '') +
          (addressVariantPromotion ? ' + address/name variant support' : ''),
      });
    }
  }

  return { assignments, reports };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Run both expansion phases and return merged results.
 *
 * @param linkedClusters  Output of linkIdentities().clusters
 * @param candidatePairs  Output of linkIdentities().candidatePairs
 * @param allInputs       All LinkerOrderInput rows in the batch
 * @param behaviourMap    Per-order refund/chargeback flags
 * @param nameMap         Per-order customer_name (for household guard)
 */
export function expandSuspiciousClusters(
  linkedClusters: LinkedCluster[],
  candidatePairs: CandidatePair[],
  allInputs: LinkerOrderInput[],
  behaviourMap: Map<string, RowBehaviourFlags>,
  nameMap: Map<string, string>,
): ClusterExpansionResult {
  const existingClusterOrderIds = new Set<string>(
    linkedClusters.flatMap((c) => c.order_ids),
  );

  // Phase 1 — promote candidate-only groups
  const { clusters: promoted, reports: phase1Reports } = promoteCandidateGroups(
    candidatePairs,
    existingClusterOrderIds,
    behaviourMap,
  );

  // Phase 2 — expand from all seed clusters (original + newly promoted)
  const allClusters = [...linkedClusters, ...promoted];
  const { assignments, reports: phase2Reports } = expandFromSeedClusters(
    allClusters,
    allInputs,
    behaviourMap,
    nameMap,
  );

  return {
    additionalClusterAssignments: assignments,
    promotedClusters: promoted,
    debugReports: [...phase1Reports, ...phase2Reports],
  };
}
