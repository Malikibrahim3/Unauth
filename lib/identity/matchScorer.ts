/**
 * Pure Identity Match Scorer
 *
 * Converts per-row identity evidence into:
 *   - identity_match_score   (0–100, identity signals only)
 *   - identity_match_grade   ('none' | 'candidate' | 'probable' | 'confirmed')
 *   - match_status           ('none' | 'candidate' | 'probable' | 'confirmed')
 *   - matched_datapoints     (human-readable labels of matched identifiers)
 *   - changed_datapoints     (human-readable labels of changed identifiers)
 *   - evidence_summary       (plain-English explanation)
 *
 * PRODUCT CONTRACT:
 *   - Refund / dispute / chargeback fields are NEVER used here.
 *   - Weak signals (name, postcode, IP, BIN+last4) cannot anchor a match.
 *   - Grade is determined by evidence tiers FIRST, numeric score second.
 *   - A pile of weak corroborators cannot outrank missing anchor evidence.
 *
 * Grade gates (evidence-first):
 *   confirmed  : Two independent strong anchors.
 *   probable   : At least one strong anchor, plus additional support.
 *   candidate  : Medium-anchor evidence or weakly corroborated identity hints.
 *   none       : Single soft signal, name-only, postcode-only, IP-only,
 *                address-only, BIN+last4-only, or no anchor at all.
 */

import {
  normaliseEmail,
  normalisePhone,
  normalisePostcode,
  normaliseCard,
  normaliseAddressFull,
  addressTokenOverlap,
  normaliseName,
  levenshtein,
  type LinkerOrderInput,
} from '../linker';
import { hasValue } from '../processing/signals';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IdentitySignalKind =
  | 'device'
  | 'account'
  | 'phone'
  | 'email'
  | 'card'
  | 'shipping_address'
  | 'billing_address'
  | 'postcode'
  | 'ip'
  | 'name';

export type EvidenceTier = 'strong' | 'medium' | 'corroborator';
export type MatchType = 'exact' | 'variant' | 'partial' | 'cross_match' | 'fuzzy';
export type MatchGrade = 'none' | 'candidate' | 'probable' | 'confirmed';
export type MatchStatus = 'none' | 'candidate' | 'probable' | 'confirmed' | 'merchant_confirmed' | 'dismissed';

export interface IdentityEvidence {
  signal: IdentitySignalKind;
  tier: EvidenceTier;
  matchType: MatchType;
  matchedValueLabel: string;
  points: number;
  anchor: boolean;
}

export interface IdentityMatchResult {
  /** 0–100, identity signals only. Never includes refund/chargeback context. */
  identity_match_score: number;
  /** Evidence-first grade. */
  identity_match_grade: MatchGrade;
  /** Product-level status. */
  match_status: MatchStatus;
  /** Structured evidence items that drove this score. */
  identity_evidence: IdentityEvidence[];
  /** Human-readable labels for matched identifiers, e.g. "same phone number". */
  matched_datapoints: string[];
  /**
   * Human-readable labels for identifiers that exist on the row but differ
   * from the cluster, e.g. "different email surface form".
   */
  changed_datapoints: string[];
  /** Plain-English explanation of the identity link. */
  evidence_summary: string;
}

// ---------------------------------------------------------------------------
// Signal definitions
// ---------------------------------------------------------------------------

/**
 * Per-signal definition: tier, point value, whether it can anchor a match,
 * and a human-readable label.
 */
const SIGNAL_DEFS: Record<
  IdentitySignalKind,
  { tier: EvidenceTier; points: number; anchor: boolean; label: string; changedLabel: string }
> = {
  device:           { tier: 'strong',       points: 30, anchor: true,  label: 'same device fingerprint',   changedLabel: 'different device fingerprint' },
  account:          { tier: 'strong',       points: 25, anchor: true,  label: 'same account ID',            changedLabel: 'different account ID' },
  phone:            { tier: 'strong',       points: 30, anchor: true,  label: 'same phone number',          changedLabel: 'different phone number' },
  // Email is a medium anchor (normalized form strips plus-aliases)
  email:            { tier: 'medium',       points: 20, anchor: true,  label: 'same email address',         changedLabel: 'new email surface form' },
  // Full shipping/billing address is a medium anchor per product spec
  shipping_address: { tier: 'medium',       points: 18, anchor: true,  label: 'same shipping address',      changedLabel: 'different shipping address' },
  billing_address:  { tier: 'medium',       points: 18, anchor: true,  label: 'same billing address',       changedLabel: 'different billing address' },
  // BIN+last4 is a corroborator per spec (not an anchor on its own)
  card:             { tier: 'corroborator', points: 10, anchor: false, label: 'same card (BIN+last4)',       changedLabel: 'different card last4' },
  postcode:         { tier: 'corroborator', points: 8,  anchor: false, label: 'same postcode',              changedLabel: 'different postcode' },
  ip:               { tier: 'corroborator', points: 6,  anchor: false, label: 'same IP address',            changedLabel: 'different IP address' },
  name:             { tier: 'corroborator', points: 5,  anchor: false, label: 'same customer name',         changedLabel: 'different customer name' },
};

const CARD_FINGERPRINT_DEF = {
  tier: 'strong' as const,
  points: 30,
  anchor: true,
  label: 'same card fingerprint',
  changedLabel: 'different card fingerprint',
};

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function getRowValues(row: LinkerOrderInput): Map<IdentitySignalKind, string> {
  const m = new Map<IdentitySignalKind, string>();

  if (hasValue(row.device_fingerprint)) m.set('device', row.device_fingerprint!.trim());
  if (hasValue(row.account_id))         m.set('account', row.account_id!.trim());
  if (hasValue(row.phone)) {
    const n = normalisePhone(row.phone);
    if (n) m.set('phone', n);
  }
  if (hasValue(row.email)) {
    const n = normaliseEmail(row.email);
    if (n) m.set('email', n);
  }
  const cardKey = normaliseCard(row.card_last4 ?? null, row.card_bin ?? null, row.card_fingerprint ?? null);
  if (cardKey) m.set('card', cardKey);
  if (hasValue(row.shipping_address ?? row.address)) {
    const addr = normaliseAddressFull(row.shipping_address ?? row.address ?? null);
    if (addr) m.set('shipping_address', addr);
  }
  if (hasValue(row.billing_address)) {
    const addr = normaliseAddressFull(row.billing_address);
    if (addr) m.set('billing_address', addr);
  }
  if (hasValue(row.postcode)) {
    const n = normalisePostcode(row.postcode);
    if (n) m.set('postcode', n);
  }
  if (hasValue(row.ip)) m.set('ip', row.ip!.trim());
  if (hasValue((row as LinkerOrderInput & { name?: string | null }).name)) {
    const n = normaliseName((row as LinkerOrderInput & { name?: string | null }).name);
    if (n) m.set('name', n);
  }

  return m;
}

function surnameAndInitial(name: string): { surname: string; initial: string } | null {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  const surname = tokens[tokens.length - 1];
  const initial = tokens[0][0] ?? '';
  if (!surname || !initial) return null;
  return { surname, initial };
}

function isNameVariantMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (levenshtein(a, b) <= 2) return true;

  const aa = surnameAndInitial(a);
  const bb = surnameAndInitial(b);
  return !!aa && !!bb && aa.surname === bb.surname && aa.initial === bb.initial;
}

function isAddressVariantMatch(a: string, b: string): boolean {
  if (a === b) return true;
  return addressTokenOverlap(a, b) >= 0.6;
}

// ---------------------------------------------------------------------------
// Hard cap rules
// ---------------------------------------------------------------------------

/**
 * Given the collected evidence, enforce the anchor rule and grade caps.
 *
 * Rules (evidence-first, numeric scores are secondary):
 *   - No anchor evidence at all → grade = 'none'
 *   - Only corroborators (no medium or strong anchors) → grade = 'none'
 *   - name-only or postcode-only or ip-only or BIN+last4-only → grade = 'none'
 *   - postcode + name (no anchor) → grade = 'none' (large merchants)
 *   - IP + postcode (no anchor) → grade = 'candidate' at most
 *   - One medium anchor + corroborators (no strong anchor) → 'candidate'
 *   - Two medium anchors (no strong anchor) → 'candidate'
 *   - One strong anchor + ≥1 corroborator → 'probable'
 *   - One strong anchor alone → 'candidate'
 *   - Two independent strong anchors → 'confirmed'
 *   - One strong anchor + many corroborators still cannot reach 'confirmed'
 */
function applyGateCaps(evidence: IdentityEvidence[]): MatchGrade {
  const strongAnchors   = evidence.filter((e) => e.tier === 'strong' && e.anchor);
  const mediumAnchors   = evidence.filter((e) => e.tier === 'medium' && e.anchor);
  const corroborators   = evidence.filter((e) => e.tier === 'corroborator' || (e.tier === 'medium' && !e.anchor));

  const hasAnyAnchor = strongAnchors.length > 0 || mediumAnchors.length > 0;

  // Hard rule: no anchor → none
  if (!hasAnyAnchor) return 'none';

  // Two independent strong anchors → confirmed
  if (strongAnchors.length >= 2) return 'confirmed';

  // One strong anchor + ≥1 medium anchor → probable
  if (strongAnchors.length === 1 && mediumAnchors.length >= 1) return 'probable';

  // One strong anchor + ≥1 corroborator → probable
  if (strongAnchors.length === 1 && corroborators.length >= 1) return 'probable';

  // One strong anchor alone → candidate
  if (strongAnchors.length === 1) return 'candidate';

  // Two medium anchors (still no strong anchor) → candidate
  if (mediumAnchors.length >= 2) return 'candidate';

  // One medium anchor + ≥1 corroborator (still no strong anchor) → candidate
  if (mediumAnchors.length === 1 && corroborators.length >= 1) return 'candidate';

  // One medium anchor alone → candidate
  if (mediumAnchors.length === 1) return 'candidate';

  return 'none';
}

// ---------------------------------------------------------------------------
// Changed datapoints
// ---------------------------------------------------------------------------

/**
 * Determine which signals the row has that differ from the cluster.
 * "Changed" means the row has a non-null value for a signal, but that value
 * doesn't match any cluster member's value for that same signal.
 */
function computeChangedDatapoints(
  rowValues: Map<IdentitySignalKind, string>,
  clusterRows: LinkerOrderInput[],
  matchedSignals: Set<IdentitySignalKind>,
): string[] {
  const changed: string[] = [];

  for (const [signal, rowVal] of rowValues.entries()) {
    // Skip if already matched
    if (matchedSignals.has(signal)) continue;

    // Check if any cluster member has this signal at all
    const clusterHasSignal = clusterRows.some((cr) => {
      const crVals = getRowValues(cr);
      return crVals.has(signal);
    });

    if (clusterHasSignal) {
      changed.push(SIGNAL_DEFS[signal].changedLabel);
    }
  }

  return changed;
}

// ---------------------------------------------------------------------------
// Main scorer entry point
// ---------------------------------------------------------------------------

/**
 * Score an individual row's identity match against its cluster.
 *
 * @param row         The LinkerOrderInput for the order being scored.
 * @param clusterRows All other LinkerOrderInput rows in the same cluster.
 *                    May include the row itself (it will be excluded internally).
 */
export function scoreIdentityMatch(
  row: LinkerOrderInput,
  clusterRows: LinkerOrderInput[],
): IdentityMatchResult {
  // Exclude the row itself from cluster comparisons
  const others = clusterRows.filter((r) => r.order_id !== row.order_id);

  // If no cluster, return none
  if (others.length === 0) {
    return {
      identity_match_score: 0,
      identity_match_grade: 'none',
      match_status: 'none',
      identity_evidence: [],
      matched_datapoints: [],
      changed_datapoints: [],
      evidence_summary: 'No prior orders to compare.',
    };
  }

  const rowValues = getRowValues(row);
  const evidence: IdentityEvidence[] = [];
  const matchedSignals = new Set<IdentitySignalKind>();

  // For each signal, check whether it matches any cluster member
  const signalOrder: IdentitySignalKind[] = [
    'device', 'account', 'phone', 'email', 'card',
    'shipping_address', 'billing_address', 'postcode', 'ip', 'name',
  ];

  for (const signal of signalOrder) {
    const rowVal = rowValues.get(signal);
    if (!rowVal) continue;

    const def = signal === 'card' && rowVal.startsWith('fp:')
      ? CARD_FINGERPRINT_DEF
      : SIGNAL_DEFS[signal];

    // Check for exact match against any cluster member
    const matchingMember = others.find((o) => {
      const otherVals = getRowValues(o);
      return otherVals.get(signal) === rowVal;
    });

    if (matchingMember) {
      evidence.push({
        signal,
        tier: def.tier,
        matchType: 'exact',
        matchedValueLabel: def.label,
        points: def.points,
        anchor: def.anchor,
      });
      matchedSignals.add(signal);
      continue;
    }

    if (signal === 'name') {
      const fuzzyMember = others.find((o) => {
        const otherVal = getRowValues(o).get('name');
        return otherVal ? isNameVariantMatch(rowVal, otherVal) : false;
      });
      if (fuzzyMember) {
        evidence.push({
          signal,
          tier: def.tier,
          matchType: 'fuzzy',
          matchedValueLabel: def.label,
          points: def.points,
          anchor: def.anchor,
        });
        matchedSignals.add(signal);
        continue;
      }
    }

    if (signal === 'shipping_address' || signal === 'billing_address') {
      const partialMember = others.find((o) => {
        const otherVal = getRowValues(o).get(signal);
        return otherVal ? isAddressVariantMatch(rowVal, otherVal) : false;
      });
      if (partialMember) {
        evidence.push({
          signal,
          tier: def.tier,
          matchType: 'partial',
          matchedValueLabel: def.label,
          points: def.points,
          anchor: def.anchor,
        });
        matchedSignals.add(signal);
      }
    }
  }

  // Apply evidence-first grade gate
  const grade = applyGateCaps(evidence);

  // Numeric score (capped at 100) — secondary to grade gate
  const rawScore = evidence.reduce((sum, e) => sum + e.points, 0);
  const identity_match_score = Math.min(rawScore, 100);

  // Determine match_status from grade
  const statusMap: Record<MatchGrade, MatchStatus> = {
    none:      'none',
    candidate: 'candidate',
    probable:  'probable',
    confirmed: 'confirmed',
  };
  const match_status: MatchStatus = statusMap[grade];

  // Matched datapoints (human-readable)
  const matched_datapoints = evidence.map((e) => e.matchedValueLabel);

  // Changed datapoints
  const changed_datapoints = computeChangedDatapoints(rowValues, others, matchedSignals);

  // Evidence summary
  const evidence_summary = buildEvidenceSummary(grade, matched_datapoints, changed_datapoints);

  return {
    identity_match_score,
    identity_match_grade: grade,
    match_status,
    identity_evidence: evidence,
    matched_datapoints,
    changed_datapoints,
    evidence_summary,
  };
}

function buildEvidenceSummary(
  grade: MatchGrade,
  matched: string[],
  changed: string[],
): string {
  if (grade === 'none' || matched.length === 0) {
    return 'Insufficient identity evidence to establish a link.';
  }

  const matchedStr = matched.length === 1
    ? matched[0]
    : `${matched.slice(0, -1).join(', ')} and ${matched[matched.length - 1]}`;

  const gradePhrases: Record<MatchGrade, string> = {
    none:      'Insufficient evidence',
    candidate: 'Possible same customer',
    probable:  'Likely same customer',
    confirmed: 'High-confidence same customer',
  };

  let summary = `${gradePhrases[grade]}: ${matchedStr} match${matched.length > 1 ? '' : 'es'} prior orders`;

  if (changed.length > 0) {
    const changedStr = changed.length === 1
      ? changed[0]
      : `${changed.slice(0, -1).join(', ')} and ${changed[changed.length - 1]}`;
    summary += `; ${changedStr}`;
  }

  summary += '.';
  return summary;
}

// ---------------------------------------------------------------------------
// Cluster-level scorer (scores every row against the cluster)
// ---------------------------------------------------------------------------

export interface ClusterIdentityResult {
  /** Per-row identity match results. */
  byOrderId: Map<string, IdentityMatchResult>;
  /**
   * Cluster-level grade — the max grade observed across all row-level results.
   * A cluster is only as strong as its best-supported pair.
   */
  clusterGrade: MatchGrade;
  clusterScore: number;
}

export function scoreClusterIdentity(
  clusterRows: LinkerOrderInput[],
): ClusterIdentityResult {
  const byOrderId = new Map<string, IdentityMatchResult>();

  for (const row of clusterRows) {
    const result = scoreIdentityMatch(row, clusterRows);
    byOrderId.set(row.order_id, result);
  }

  // Cluster grade = best row grade
  const gradeOrder: MatchGrade[] = ['none', 'candidate', 'probable', 'confirmed'];
  let clusterGrade: MatchGrade = 'none';
  let clusterScore = 0;

  for (const result of byOrderId.values()) {
    const idx = gradeOrder.indexOf(result.identity_match_grade);
    if (idx > gradeOrder.indexOf(clusterGrade)) {
      clusterGrade = result.identity_match_grade;
    }
    if (result.identity_match_score > clusterScore) {
      clusterScore = result.identity_match_score;
    }
  }

  return { byOrderId, clusterGrade, clusterScore };
}
