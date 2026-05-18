/**
 * Identity Linker v2 — single-responsibility in-batch identity clustering.
 *
 * Given a batch of orders, this module decides which orders are probably from
 * the same person. It does not score fraud, it does not make recommendations,
 * and it does not consult any persistent store. The merchant decides what
 * action to take based on the linked clusters plus their own refund/INR
 * intelligence (handled outside the linker).
 *
 * Pipeline (must run in this order):
 *   1. NORMALISE every field into all relevant tiers (exact + partial/fuzzy).
 *   2. BUILD INDEXES per tier.
 *   3. EXTRACT CANDIDATE PAIRS from multi-order index entries.
 *   4. SCORE each candidate pair by picking the strongest tier per signal
 *      family and summing the tier weights. Special rules for IP and postcode.
 *   5. UNION-FIND linked pairs into clusters with deterministic cluster_ids.
 *
 * Signal family weights (Step 4):
 *   phone            exact 30 / partial 15
 *   device           exact 30
 *   account          exact 25
 *   shipping_address exact 22 / partial 12
 *   billing_address  exact 22 / partial 12   (+ cross-match 18)
 *   email            exact 20 / username 15
 *   name             exact 18 / fuzzy 10
 *   card             bin+last4 12 / last4 8
 *   postcode         full 10 / outward 5
 *   ip               exact 8 / subnet 4
 *
 *   Link threshold       : 30
 *   Possible (flag only) : 15–29
 *
 * Anchor rule: postcode and ip never count alone. A pair whose only fired
 * tiers are postcode and/or ip scores 0.
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Input shape — intentionally loose so we can ingest from both the CSV
// NormalisedOrder and ad-hoc callers. Everything is optional except order_id.
// ---------------------------------------------------------------------------

export interface LinkerOrderInput {
  order_id: string;
  email?: string | null;
  phone?: string | null;
  /** Legacy field — kept as alias for shipping_address. */
  address?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  postcode?: string | null;
  ip?: string | null;
  card_last4?: string | null;
  card_bin?: string | null;
  /** PSP/card-network fingerprint. Prefer this over BIN+last4 when present. */
  card_fingerprint?: string | null;
  device_fingerprint?: string | null;
  account_id?: string | null;
  name?: string | null;
}

export type LinkerSignal =
  | 'card'
  | 'phone'
  | 'device'
  | 'account'
  | 'email'
  | 'postcode'
  | 'ip'
  | 'name'
  | 'shipping_address'
  | 'billing_address';

export interface CandidatePair {
  order_id_a: string;
  order_id_b: string;
  score: number;
  signals: LinkerSignal[];
  evidence: string[]; // e.g. ["name:exact", "email:username"]
}

export interface LinkedCluster {
  cluster_id: string;
  order_ids: string[];
  confidence_score: number;   // max pair score observed in the cluster
  signals_matched: LinkerSignal[];
  evidence_summary: string[]; // union of evidence tiers across all pairs in the cluster
}

export interface SkippedGroupDiagnostic {
  signal: string;
  groupKey: string;
  groupSize: number;
  strategy: 'localized_expansion' | 'skipped_no_suspicious_nodes';
  evaluatedPairs: number;
  skippedCartesianPairs: number;
}

export interface LinkerResult {
  clusters: LinkedCluster[];
  candidatePairs: CandidatePair[];
  diagnostics: SkippedGroupDiagnostic[];
}

// ---------------------------------------------------------------------------
// Step 1 — Normalisation. Pure, no I/O, no network.
// ---------------------------------------------------------------------------

/**
 * Consumer email providers that ignore dots in the local part. Only for these
 * domains do we strip dots — for business/custom domains, dots distinguish
 * different people (john.doe@acmecorp.com ≠ johndoe@acmecorp.com).
 */
const DOT_IGNORING_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'fastmail.com', 'fastmail.fm',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com',
]);

/**
 * Email: strip plus aliases, lowercase. Remove dots before @ only for
 * consumer providers known to ignore them (Gmail, iCloud, Proton, etc.).
 * For business/custom domains dots are significant — stripping them would
 * create false-positive identity links between different employees.
 *
 * Plus-alias stripping is universal (RFC 5233 sub-addressing).
 */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const plusStripped = lower.slice(0, at).split('+')[0];
  const domain = lower.slice(at + 1);
  const localPart = DOT_IGNORING_DOMAINS.has(domain)
    ? plusStripped.replace(/\./g, '')
    : plusStripped;
  if (!localPart) return null;
  return `${localPart}@${domain}`;
}

/**
 * Phone: strip non-digits, handle UK +44/0 prefix, return a canonical
 * digit string. Not a strict E.164 reconstruction — we only need values
 * normalised the same way on both sides of a comparison.
 *
 * UK-specific rules:
 *   +44 7xxxxxxxxx → 447xxxxxxxxx        (no leading 0 after +44)
 *   07xxxxxxxxx    → 447xxxxxxxxx        (domestic 0 → international 44)
 *   44 7xxxxxxxxx  → 447xxxxxxxxx
 *
 * Everything else: return the digit string unchanged (US, AU, other
 * international numbers already pass-through consistently).
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return null;
  // UK special-cases
  if (digits.startsWith('44') && digits.length === 12) {
    return digits; // already 44 + 10 digits
  }
  if (digits.startsWith('0044') && digits.length === 14) {
    return digits.slice(2); // strip 00 international-access prefix
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `44${digits.slice(1)}`; // 07xxx… → 447xxx…
  }
  return digits;
}

/**
 * Address: lowercase, expand common UK/US abbreviations to full form,
 * strip punctuation, collapse whitespace, return the token array sorted
 * alphabetically.
 *
 * Sorting tokens means "23 Baker Street" and "Baker Street 23" produce
 * identical arrays — the rare cases where sort order actually carries
 * meaning (e.g. apartment numbers) are covered by postcode matching,
 * not street-text matching.
 *
 * NOTE: Address tokens are NOT used as a linker signal per spec §4. This
 * helper is exported purely so the next module can use it for display /
 * evidence. `linkIdentities` ignores whatever this returns.
 */
const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  st: 'street',
  rd: 'road',
  ave: 'avenue',
  av: 'avenue',
  ln: 'lane',
  cl: 'close',
  dr: 'drive',
  blvd: 'boulevard',
  bvd: 'boulevard',
  ct: 'court',
  pl: 'place',
  sq: 'square',
  apt: 'apartment',
};

export function normaliseAddress(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(' ').map((t) => ADDRESS_ABBREVIATIONS[t] ?? t);
  return tokens.sort();
}

/**
 * Postcode: uppercase, remove all whitespace.
 *   "sw1a 1aa" → "SW1A1AA"
 *
 * We do not validate against UK/US postcode shapes — the merchant may be
 * in any country. Returning an empty string on blank input lets callers
 * safely do `if (postcode)` instead of a null check.
 */
export function normalisePostcode(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.toUpperCase().replace(/\s+/g, '');
}

/**
 * Card: strip non-digits, produce "BIN-LAST4" when both are present,
 * else "LAST4" alone, else null.
 *
 * A BIN prefix meaningfully increases specificity — two customers with
 * the same last4 from different issuers are easily distinguishable once
 * the BIN is included.
 */
export function normaliseCard(
  last4: string | null | undefined,
  bin?: string | null | undefined,
  fingerprint?: string | null | undefined
): string | null {
  const fp = (fingerprint ?? '').trim().toLowerCase();
  if (fp) {
    const h = createHash('sha256').update(fp).digest('hex');
    return `fp:${h}`;
  }
  const digits4 = (last4 ?? '').replace(/\D/g, '').slice(-4);
  if (digits4.length !== 4) return null;
  const digitsBin = (bin ?? '').replace(/\D/g, '').slice(0, 8);
  return digitsBin.length >= 6 ? `${digitsBin}-${digits4}` : digits4;
}

// ---------------------------------------------------------------------------
// Name normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a customer name to a canonical form for exact comparison.
 *
 *   "Mike Brett"     → "mike brett"
 *   "  MIKE  BRETT " → "mike brett"
 *   "Brett, Mike"    → "mike brett"        (Last, First reversal)
 *   "Mike  D. Brett" → "mike d brett"      (punctuation collapsed)
 *
 * Returns null for blank/placeholder values. Single-word names are kept
 * verbatim (no reversal) — they'd reorder to themselves anyway.
 */
export function normaliseName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z\s,]/g, ' ')     // keep letters, spaces, commas
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;

  // "Last, First" → "First Last"
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      return `${parts[1]} ${parts[0]}`.replace(/\s+/g, ' ').trim();
    }
  }

  return cleaned.replace(/,/g, '').replace(/\s+/g, ' ').trim() || null;
}

/**
 * Levenshtein distance — O(m·n) iterative two-row implementation.
 * Used for name fuzzy matching only.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i, ...Array(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Coarse fuzzy bucket key for names. Two names sharing the same bucket key
 * are CANDIDATES for Levenshtein comparison.
 * Bucket = first 3 alpha chars of first token + last token's first 3 alpha chars.
 */
export function nameFuzzyBucket(name: string): string | null {
  if (!name) return null;
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const first = tokens[0].slice(0, 3);
  const last = tokens.length > 1 ? tokens[tokens.length - 1].slice(0, 3) : '';
  return `${first}${last}` || null;
}

// ---------------------------------------------------------------------------
// Email username (alpha-only local part)
// ---------------------------------------------------------------------------

/**
 * Strip everything non-alpha from the email local part.
 *
 *   "mike.brett830@gmail.com"  → "mikebrett"
 *   "mike_brett24@yahoo.co.uk" → "mikebrett"
 *   "j.harrison+orders@gmail.com" → "jharrison"
 *
 * Returns null when the resulting alpha-string is < 4 chars.
 */
export function emailUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const at = raw.toLowerCase().indexOf('@');
  if (at < 1) return null;
  const local = raw.toLowerCase().slice(0, at);
  const alpha = local.replace(/[^a-z]/g, '');
  return alpha.length >= 4 ? alpha : null;
}

// ---------------------------------------------------------------------------
// Address — full string + token set (for partial overlap)
// ---------------------------------------------------------------------------

/**
 * Full normalised address as a single string (tokens joined by space).
 * Returns null for blank.
 */
export function normaliseAddressFull(raw: string | null | undefined): string | null {
  const tokens = normaliseAddress(raw);
  return tokens.length > 0 ? tokens.join(' ') : null;
}

/**
 * Jaccard token-set overlap between two normalised address strings.
 * Used for the "partial" tier of address matching.
 */
export function addressTokenOverlap(
  aFull: string | null,
  bFull: string | null
): number {
  if (!aFull || !bFull) return 0;
  const aSet = new Set(aFull.split(' ').filter((t) => t.length > 1));
  const bSet = new Set(bFull.split(' ').filter((t) => t.length > 1));
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let inter = 0;
  for (const t of aSet) if (bSet.has(t)) inter++;
  const union = aSet.size + bSet.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ---------------------------------------------------------------------------
// Phone partial (last 7 digits)
// ---------------------------------------------------------------------------

/** Last 7 digits of a normalised phone, or null if too short. */
export function phonePartial(normPhone: string | null): string | null {
  if (!normPhone || normPhone.length < 7) return null;
  return normPhone.slice(-7);
}

// ---------------------------------------------------------------------------
// Postcode outward (area-level)
// ---------------------------------------------------------------------------

/**
 * UK postcode outward code — the part before the inward digit.
 *
 *   "SW1A1AA" → "SW1A"
 *   "E145AB"  → "E14"
 *   "M11AE"   → "M1"
 */
export function postcodeOutward(normPostcode: string): string | null {
  if (!normPostcode) return null;
  const m = normPostcode.match(/^([A-Z]{1,2}\d[A-Z\d]?)\d[A-Z]{2}$/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// IP subnet (/24 for IPv4)
// ---------------------------------------------------------------------------

/** First 3 octets of an IPv4 address. Returns null for IPv6 / malformed. */
export function ipSubnet(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Step 2 — Indexes. A plain data structure; one pass over input.
// ---------------------------------------------------------------------------

interface NormalisedOrder {
  order_id: string;
  email: string | null;
  email_username: string | null;
  email_domain: string | null;       // for cross-domain email:username check
  phone: string | null;
  phone_partial: string | null;
  card: string | null;
  ip: string | null;
  ip_subnet: string | null;
  postcode: string;
  postcode_outward: string | null;
  device: string | null;
  account: string | null;
  name: string | null;
  name_bucket: string | null;
  shipping_full: string | null;
  shipping_tokens: string[];
  billing_full: string | null;
  billing_tokens: string[];
}

interface Indexes {
  email: Map<string, string[]>;
  email_username: Map<string, string[]>;
  phone: Map<string, string[]>;
  phone_partial: Map<string, string[]>;
  card: Map<string, string[]>;
  ip: Map<string, string[]>;
  ip_subnet: Map<string, string[]>;
  postcode: Map<string, string[]>;
  postcode_outward: Map<string, string[]>;
  device: Map<string, string[]>;
  account: Map<string, string[]>;
  name: Map<string, string[]>;
  name_bucket: Map<string, string[]>;
  shipping_full: Map<string, string[]>;
  billing_full: Map<string, string[]>;
}

function pushIndex(idx: Map<string, string[]>, key: string | null | undefined, orderId: string): void {
  if (!key) return;
  const arr = idx.get(key);
  if (arr) arr.push(orderId);
  else idx.set(key, [orderId]);
}

function buildIndexes(orders: NormalisedOrder[]): Indexes {
  const ix: Indexes = {
    email: new Map(), email_username: new Map(),
    phone: new Map(), phone_partial: new Map(),
    card: new Map(),
    ip: new Map(), ip_subnet: new Map(),
    postcode: new Map(), postcode_outward: new Map(),
    device: new Map(), account: new Map(),
    name: new Map(), name_bucket: new Map(),
    shipping_full: new Map(), billing_full: new Map(),
  };
  for (const o of orders) {
    pushIndex(ix.email,            o.email,            o.order_id);
    pushIndex(ix.email_username,   o.email_username,   o.order_id);
    pushIndex(ix.phone,            o.phone,            o.order_id);
    pushIndex(ix.phone_partial,    o.phone_partial,    o.order_id);
    pushIndex(ix.card,             o.card,             o.order_id);
    pushIndex(ix.ip,               o.ip,               o.order_id);
    pushIndex(ix.ip_subnet,        o.ip_subnet,        o.order_id);
    pushIndex(ix.postcode,         o.postcode || null, o.order_id);
    pushIndex(ix.postcode_outward, o.postcode_outward, o.order_id);
    pushIndex(ix.device,           o.device,           o.order_id);
    pushIndex(ix.account,          o.account,          o.order_id);
    pushIndex(ix.name,             o.name,             o.order_id);
    pushIndex(ix.name_bucket,      o.name_bucket,      o.order_id);
    pushIndex(ix.shipping_full,    o.shipping_full,    o.order_id);
    pushIndex(ix.billing_full,     o.billing_full,     o.order_id);
  }
  return ix;
}

// ---------------------------------------------------------------------------
// Step 3 — Candidate pair extraction.
// For each index, take every group with >=2 orders and emit all pair-wise
// combinations. A pair may appear from multiple indexes; we union their
// signals downstream.
// ---------------------------------------------------------------------------

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

interface PairAccumulator {
  order_id_a: string;
  order_id_b: string;
  signals: Set<LinkerSignal>;
}

function addPairToMap(
  a: string,
  b: string,
  signal: LinkerSignal,
  pairs: Map<string, PairAccumulator>
): void {
  const key = pairKey(a, b);
  let acc = pairs.get(key);
  if (!acc) {
    acc = {
      order_id_a: a < b ? a : b,
      order_id_b: a < b ? b : a,
      signals: new Set<LinkerSignal>(),
    };
    pairs.set(key, acc);
  }
  acc.signals.add(signal);
}

/**
 * Generate all pair combinations for a group (existing behaviour).
 * Used for strong signals and small weak-signal groups.
 */
function addSignalPairsFrom(
  idx: Map<string, string[]>,
  signal: LinkerSignal,
  pairs: Map<string, PairAccumulator>,
  maxGroupSize = 500
): void {
  for (const orderIds of Array.from(idx.values())) {
    if (orderIds.length < 2) continue;
    if (orderIds.length > maxGroupSize) continue;
    const unique = Array.from(new Set(orderIds));
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        addPairToMap(unique[i], unique[j], signal, pairs);
      }
    }
  }
}

/**
 * Selective weak-signal expansion for large groups.
 *
 * Instead of skipping groups > maxGroupSize entirely (which loses recall on
 * sparse fraud rings), we only expand around nodes that are already
 * "suspicious" — i.e., connected to at least one other order via a strong
 * signal. This keeps pair generation sub-quadratic while recovering the
 * bridge edges that sparse fraud rings depend on.
 *
 * Strategy:
 *   1. Identify suspicious nodes (already have strong-signal pairs).
 *   2. For each suspicious node, pair it with up to maxExpansionPerNode
 *      other members of the group.
 *   3. If no suspicious nodes exist in the group, skip it entirely — a
 *      weak signal alone cannot anchor a fraud cluster.
 */
function addWeakSignalPairsSelective(
  idx: Map<string, string[]>,
  signal: LinkerSignal,
  pairs: Map<string, PairAccumulator>,
  maxGroupSize = 50,
  maxExpansionPerNode = 25
): SkippedGroupDiagnostic[] {
  const diagnostics: SkippedGroupDiagnostic[] = [];

  // Collect nodes that already participate in at least one strong-signal pair.
  // These are our "suspicious" anchors — weak-signal expansion only fans out
  // from them, never from completely cold nodes.
  const suspiciousNodes = new Set<string>();
  for (const acc of pairs.values()) {
    suspiciousNodes.add(acc.order_id_a);
    suspiciousNodes.add(acc.order_id_b);
  }

  for (const [groupKey, orderIds] of Array.from(idx.entries())) {
    if (orderIds.length < 2) continue;

    const unique = Array.from(new Set(orderIds));

    if (unique.length <= maxGroupSize) {
      // Small group — full pair generation (existing behaviour, no regression risk)
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          addPairToMap(unique[i], unique[j], signal, pairs);
        }
      }
      continue;
    }

    // Large group — selective expansion
    const suspiciousInGroup = unique.filter((id) => suspiciousNodes.has(id));

    if (suspiciousInGroup.length === 0) {
      const cartesianPairs = (unique.length * (unique.length - 1)) / 2;
      diagnostics.push({
        signal,
        groupKey,
        groupSize: unique.length,
        strategy: 'skipped_no_suspicious_nodes',
        evaluatedPairs: 0,
        skippedCartesianPairs: cartesianPairs,
      });
      continue;
    }

    let evaluatedPairs = 0;

    for (const suspiciousId of suspiciousInGroup) {
      const candidates = unique.filter((id) => id !== suspiciousId);
      const limited = candidates.slice(0, maxExpansionPerNode);
      for (const candidateId of limited) {
        addPairToMap(suspiciousId, candidateId, signal, pairs);
        evaluatedPairs++;
      }
    }

    const cartesianPairs = (unique.length * (unique.length - 1)) / 2;
    diagnostics.push({
      signal,
      groupKey,
      groupSize: unique.length,
      strategy: 'localized_expansion',
      evaluatedPairs,
      skippedCartesianPairs: cartesianPairs - evaluatedPairs,
    });
  }

  return diagnostics;
}

type IndependenceGroup = 'contact' | 'payment' | 'network_device' | 'location' | 'name';

interface FiredSignal {
  family: LinkerSignal;
  tier: string;
  weight: number;
  independenceGroup: IndependenceGroup;
  frequency: number;
}

const COMMON_WEAK_SIGNAL_LIMIT = 12;
const VERY_COMMON_WEAK_SIGNAL_LIMIT = 40;

function indexFrequency(idx: Map<string, string[]>, key: string | null | undefined): number {
  if (!key) return 0;
  return idx.get(key)?.length ?? 0;
}

function signalIndependenceGroup(family: LinkerSignal, tier: string): IndependenceGroup {
  if (family === 'card') return 'payment';
  if (family === 'device' || family === 'ip') return 'network_device';
  if (family === 'shipping_address' || family === 'billing_address' || family === 'postcode') return 'location';
  if (family === 'name') return 'name';
  return 'contact';
}

function isWeakOrCollisionProneSignal(family: LinkerSignal, tier: string): boolean {
  if (family === 'name' || family === 'postcode' || family === 'ip') return true;
  if (family === 'shipping_address' || family === 'billing_address') return true;
  if (family === 'email' && tier !== 'exact') return true;
  if (family === 'phone' && tier !== 'exact') return true;
  if (family === 'card' && tier !== 'fingerprint') return true;
  return false;
}

function addFiredSignal(
  fired: FiredSignal[],
  family: LinkerSignal,
  tier: string,
  weight: number,
  frequency: number,
  applyFrequencyPenalty = true
): void {
  let adjustedWeight = weight;
  if (applyFrequencyPenalty && isWeakOrCollisionProneSignal(family, tier)) {
    if (frequency > VERY_COMMON_WEAK_SIGNAL_LIMIT) adjustedWeight = 0;
    else if (frequency > COMMON_WEAK_SIGNAL_LIMIT) adjustedWeight = Math.floor(weight * 0.4);
  }
  if (adjustedWeight <= 0) return;
  fired.push({
    family,
    tier,
    weight: adjustedWeight,
    independenceGroup: signalIndependenceGroup(family, tier),
    frequency,
  });
}

function isExactEmailSignal(f: FiredSignal): boolean {
  return f.family === 'email' && f.tier === 'exact';
}

function isStrongPersonalAnchorSignal(f: FiredSignal): boolean {
  if (f.family === 'phone' && f.tier === 'exact') return true;
  if (f.family === 'device' && f.tier === 'exact') return true;
  if (f.family === 'card' && f.tier === 'fingerprint') return true;
  return isExactEmailSignal(f);
}

function hasCorroboratedAccountIdentity(fired: FiredSignal[]): boolean {
  const evidence = new Set(fired.map((f) => `${f.family}:${f.tier}`));
  if (!evidence.has('account:exact')) return false;
  const hasName = evidence.has('name:exact') || evidence.has('name:fuzzy');
  const hasCardFull = evidence.has('card:full');
  const hasEmailUsername = evidence.has('email:username');
  const hasPhonePartial = evidence.has('phone:partial');
  const hasLocation =
    evidence.has('shipping_address:exact') ||
    evidence.has('shipping_address:partial') ||
    evidence.has('billing_address:exact') ||
    evidence.has('billing_address:partial') ||
    evidence.has('billing_address:cross') ||
    evidence.has('postcode:full');
  const hasNetwork = evidence.has('ip:exact') || evidence.has('ip:subnet');
  return (
    (hasName && (hasCardFull || hasEmailUsername || hasPhonePartial || hasLocation || hasNetwork)) ||
    (hasCardFull && hasEmailUsername)
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Scoring.
//
// Each pair is evaluated for every signal family. The strongest tier that
// fires for that family wins; lower tiers are ignored. Sum the tier weights
// for the final score. Anchor rule: postcode and ip never count alone.
// ---------------------------------------------------------------------------

/** Tier scores per signal family. Pick at most ONE tier per family per pair. */
const FAMILY_TIERS = {
  phone:            { exact: 30, partial: 15 },
  device:           { exact: 30 },
  account:          { exact: 25 },
  shipping_address: { exact: 22, partial: 12 },
  billing_address:  { exact: 22, partial: 12 },
  email:            { exact: 35, username: 15 },
  name:             { exact: 18, fuzzy: 10 },
  card:             { fingerprint: 30, full: 12, last4: 8 },
  postcode:         { full: 10, outward: 5 },
  ip:               { exact: 8, subnet: 4 },
} as const;

/** Max possible score for a family (for sorting evidence by strength). */
function familyMaxScore(family: LinkerSignal): number {
  const tiers = FAMILY_TIERS[family as keyof typeof FAMILY_TIERS];
  if (!tiers) return 0;
  return Math.max(...Object.values(tiers));
}

/** Pairs scoring >= LINK_THRESHOLD are treated as the same person. */
const LINK_THRESHOLD = 30;
/** Pairs scoring >= POSSIBLE_THRESHOLD are surfaced as possible matches. */
const POSSIBLE_THRESHOLD = 15;

function jaccardTokens(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const aSet = new Set(a.filter((t) => t.length > 1));
  const bSet = new Set(b.filter((t) => t.length > 1));
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let inter = 0;
  for (const t of aSet) if (bSet.has(t)) inter++;
  const union = aSet.size + bSet.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Score a pair by walking both orders and picking the strongest tier per
 * family that matches. Returns the final score, the broad family signals,
 * and the tiered evidence strings.
 */
function scorePair(
  a: NormalisedOrder,
  b: NormalisedOrder,
  bonusCrossAddress: boolean,
  ix: Indexes,
  options: { allowWeakOnly?: boolean; applyFrequencyPenalty?: boolean } = {}
): { score: number; signals: LinkerSignal[]; evidence: string[] } {
  const fired: FiredSignal[] = [];
  const applyFrequencyPenalty = options.applyFrequencyPenalty ?? true;

  // phone
  if (a.phone && b.phone && a.phone === b.phone) {
    addFiredSignal(fired, 'phone', 'exact', 30, indexFrequency(ix.phone, a.phone), applyFrequencyPenalty);
  } else if (a.phone_partial && b.phone_partial && a.phone_partial === b.phone_partial) {
    addFiredSignal(fired, 'phone', 'partial', 15, indexFrequency(ix.phone_partial, a.phone_partial), applyFrequencyPenalty);
  }

  // device
  if (a.device && b.device && a.device === b.device) {
    addFiredSignal(fired, 'device', 'exact', 30, indexFrequency(ix.device, a.device), applyFrequencyPenalty);
  }

  // account
  if (a.account && b.account && a.account === b.account) {
    addFiredSignal(fired, 'account', 'exact', 25, indexFrequency(ix.account, a.account), applyFrequencyPenalty);
  }

  // shipping_address
  if (a.shipping_full && b.shipping_full && a.shipping_full === b.shipping_full) {
    addFiredSignal(fired, 'shipping_address', 'exact', 22, indexFrequency(ix.shipping_full, a.shipping_full), applyFrequencyPenalty);
  } else if (a.shipping_tokens.length > 0 && b.shipping_tokens.length > 0) {
    const ov = jaccardTokens(a.shipping_tokens, b.shipping_tokens);
    if (ov >= 0.75) addFiredSignal(fired, 'shipping_address', 'partial', 12, 0, applyFrequencyPenalty);
  }

  // billing_address
  if (a.billing_full && b.billing_full && a.billing_full === b.billing_full) {
    addFiredSignal(fired, 'billing_address', 'exact', 22, indexFrequency(ix.billing_full, a.billing_full), applyFrequencyPenalty);
  } else if (a.billing_tokens.length > 0 && b.billing_tokens.length > 0) {
    const ov = jaccardTokens(a.billing_tokens, b.billing_tokens);
    if (ov >= 0.75) addFiredSignal(fired, 'billing_address', 'partial', 12, 0, applyFrequencyPenalty);
  }

  // shipping↔billing cross-match bonus
  if (bonusCrossAddress) {
    addFiredSignal(fired, 'billing_address', 'cross', 18, 0, applyFrequencyPenalty);
  }

  // email
  if (a.email && b.email && a.email === b.email) {
    addFiredSignal(fired, 'email', 'exact', 35, indexFrequency(ix.email, a.email), applyFrequencyPenalty);
  } else if (
    a.email_username && b.email_username && a.email_username === b.email_username &&
    a.email_domain && b.email_domain && a.email_domain !== b.email_domain
  ) {
    addFiredSignal(fired, 'email', 'username', 15, indexFrequency(ix.email_username, a.email_username), applyFrequencyPenalty);
  }

  // name
  if (a.name && b.name && a.name === b.name) {
    addFiredSignal(fired, 'name', 'exact', 18, indexFrequency(ix.name, a.name), applyFrequencyPenalty);
  } else if (a.name && b.name && a.name.length >= 6 && b.name.length >= 6) {
    if (a.name_bucket && a.name_bucket === b.name_bucket) {
      if (levenshtein(a.name, b.name) <= 2) {
        addFiredSignal(fired, 'name', 'fuzzy', 10, indexFrequency(ix.name_bucket, a.name_bucket), applyFrequencyPenalty);
      }
    }
  }

  // card
  if (a.card && b.card && a.card === b.card) {
    const tier = a.card.startsWith('fp:') ? 'fingerprint' : (a.card.includes('-') ? 'full' : 'last4');
    const weight = tier === 'fingerprint' ? 30 : (tier === 'full' ? 12 : 8);
    addFiredSignal(fired, 'card', tier, weight, indexFrequency(ix.card, a.card), applyFrequencyPenalty);
  }

  // postcode
  if (a.postcode && b.postcode && a.postcode === b.postcode) {
    addFiredSignal(fired, 'postcode', 'full', 10, indexFrequency(ix.postcode, a.postcode), applyFrequencyPenalty);
  } else if (a.postcode_outward && b.postcode_outward && a.postcode_outward === b.postcode_outward) {
    addFiredSignal(fired, 'postcode', 'outward', 5, indexFrequency(ix.postcode_outward, a.postcode_outward), applyFrequencyPenalty);
  }

  // ip
  if (a.ip && b.ip && a.ip === b.ip) {
    addFiredSignal(fired, 'ip', 'exact', 8, indexFrequency(ix.ip, a.ip), applyFrequencyPenalty);
  } else if (a.ip_subnet && b.ip_subnet && a.ip_subnet === b.ip_subnet) {
    addFiredSignal(fired, 'ip', 'subnet', 4, indexFrequency(ix.ip_subnet, a.ip_subnet), applyFrequencyPenalty);
  }

  const hasExactEmail = fired.some(isExactEmailSignal);
  if (!hasExactEmail && !options.allowWeakOnly) {
    if (!fired.some(isStrongPersonalAnchorSignal) && !hasCorroboratedAccountIdentity(fired)) {
      return { score: 0, signals: [], evidence: [] };
    }

    const independentGroups = new Set(fired.map((f) => f.independenceGroup));
    if (independentGroups.size < 2) {
      return { score: 0, signals: [], evidence: [] };
    }
  }

  const rawScore = fired.reduce((s, f) => s + f.weight, 0);
  const score = hasExactEmail ? Math.max(rawScore, LINK_THRESHOLD) : rawScore;
  const signals = Array.from(new Set(fired.map((f) => f.family))).sort(
    (x, y) => familyMaxScore(y) - familyMaxScore(x)
  );
  const evidence = fired
    .slice()
    .sort((x, y) => y.weight - x.weight)
    .map((f) => `${f.family}:${f.tier}`);

  return { score, signals, evidence };
}

// ---------------------------------------------------------------------------
// Step 5 — Union-find cluster assembly.
// ---------------------------------------------------------------------------

class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    let p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }
    // Path compression
    while (p !== this.parent.get(p)) {
      const gp = this.parent.get(p)!;
      this.parent.set(p, this.parent.get(gp)!);
      p = this.parent.get(p)!;
    }
    return p;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    // Deterministic: always point the lexicographically larger root at the
    // smaller one. This guarantees identical input yields identical cluster
    // roots regardless of pair iteration order.
    if (ra < rb) this.parent.set(rb, ra);
    else this.parent.set(ra, rb);
  }
}

function hasStableIdentityConflict(
  orderIds: string[],
  byId: Map<string, NormalisedOrder>,
  evidence: Set<string> = new Set()
): boolean {
  const hasLocationContinuity =
    evidence.has('shipping_address:exact') ||
    evidence.has('shipping_address:partial') ||
    evidence.has('billing_address:exact') ||
    evidence.has('billing_address:partial') ||
    evidence.has('billing_address:cross') ||
    evidence.has('postcode:full');
  const hasNetworkContinuity = evidence.has('ip:exact') || evidence.has('ip:subnet');
  const hasStrongDriftContinuity = evidence.has('card:full') || evidence.has('email:exact');
  const hasEmailUsernameDriftContinuity = evidence.has('email:username') && !hasNetworkContinuity;
  const allowsPhoneDrift =
    (evidence.has('name:exact') || evidence.has('name:fuzzy')) &&
    (hasStrongDriftContinuity || hasEmailUsernameDriftContinuity) &&
    hasLocationContinuity;

  const families: Array<'phone' | 'device' | 'account'> = ['phone', 'device', 'account'];
  for (const family of families) {
    const values = new Set<string>();
    for (const id of orderIds) {
      const value = byId.get(id)?.[family];
      if (value) values.add(value);
      if (values.size > 1) {
        if (family === 'phone' && allowsPhoneDrift) continue;
        return true;
      }
    }
  }
  return false;
}

function bestEvidenceWeights(evidence: string[]): Map<LinkerSignal, number> {
  const weights = new Map<LinkerSignal, number>();
  for (const item of evidence) {
    const [familyRaw, tierRaw] = item.split(':');
    const family = familyRaw as LinkerSignal;
    const tier = tierRaw as string;
    const tiers = FAMILY_TIERS[family as keyof typeof FAMILY_TIERS] as Record<string, number> | undefined;
    const weight = tiers?.[tier] ?? 0;
    if (weight > (weights.get(family) ?? 0)) weights.set(family, weight);
  }
  return weights;
}

function isGraphChainEdgeEligible(score: number, evidence: string[]): boolean {
  const evidenceSet = new Set(evidence);
  const onlyNameAndEmailUsername = evidence.every(
    (item) => item.startsWith('name:') || item === 'email:username'
  ) && evidenceSet.has('email:username');
  if (onlyNameAndEmailUsername) return false;
  return score >= LINK_THRESHOLD - 2;
}

function hasAccountGraphCorroboration(evidence: Set<string>): boolean {
  if (!evidence.has('account:exact')) return true;
  if (
    evidence.has('email:exact') ||
    evidence.has('phone:exact') ||
    evidence.has('device:exact') ||
    evidence.has('card:fingerprint')
  ) {
    return true;
  }
  const hasName = evidence.has('name:exact') || evidence.has('name:fuzzy');
  const hasCardFull = evidence.has('card:full');
  const hasEmailUsername = evidence.has('email:username');
  const hasLocation =
    evidence.has('shipping_address:exact') ||
    evidence.has('shipping_address:partial') ||
    evidence.has('billing_address:exact') ||
    evidence.has('billing_address:partial') ||
    evidence.has('billing_address:cross') ||
    evidence.has('postcode:full');
  const hasNetwork = evidence.has('ip:exact') || evidence.has('ip:subnet');
  return (
    (hasName && (hasCardFull || hasEmailUsername || hasLocation || hasNetwork)) ||
    (hasCardFull && hasEmailUsername)
  );
}

function hasGraphIdentityContinuity(evidence: Set<string>): boolean {
  if (
    evidence.has('email:exact') ||
    evidence.has('phone:exact') ||
    evidence.has('device:exact') ||
    evidence.has('card:fingerprint')
  ) {
    return true;
  }
  return (
    evidence.has('email:username') ||
    evidence.has('phone:partial') ||
    evidence.has('name:exact') ||
    evidence.has('name:fuzzy')
  );
}

function isHighConfidenceGraphEdge(evidence: string[], score: number): boolean {
  if (score < 80) return false;
  const set = new Set(evidence);
  if (!hasAccountGraphCorroboration(set)) return false;
  if (!hasGraphIdentityContinuity(set)) return false;
  const hasLocation =
    set.has('shipping_address:exact') ||
    set.has('shipping_address:partial') ||
    set.has('billing_address:exact') ||
    set.has('billing_address:partial') ||
    set.has('billing_address:cross') ||
    set.has('postcode:full');
  const hasNetwork = set.has('ip:exact') || set.has('ip:subnet');
  const hasName = set.has('name:exact') || set.has('name:fuzzy');
  const hasEmailUsername = set.has('email:username');
  const hasCardFull = set.has('card:full');
  const hasExactIdentity =
    set.has('email:exact') ||
    set.has('phone:exact') ||
    set.has('device:exact') ||
    set.has('card:fingerprint');

  if (hasExactIdentity) return true;
  if (hasCardFull && (hasName || hasEmailUsername)) return true;
  if (hasEmailUsername && (hasLocation || hasNetwork || hasName)) return true;
  return false;
}

/**
 * Deterministic UUID-v4-shaped cluster identifier derived from the sorted
 * member order_ids. Same set of members → same cluster_id across runs.
 *
 * Exported so that the second-stage cluster expansion can mint stable IDs
 * for promoted candidate groups without re-implementing the same hash logic.
 */
export function deterministicClusterId(orderIds: string[]): string {
  const sorted = [...orderIds].sort();
  const h = createHash('sha256').update(sorted.join('|')).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ---------------------------------------------------------------------------
// Data quality guards — catch obviously corrupt merchant CSV values.
// ---------------------------------------------------------------------------

const COUNTRY_CODES = new Set([
  'GB', 'US', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI',
  'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'IE', 'PT', 'GR',
  'CY', 'MT', 'LU', 'AU', 'CA', 'NZ', 'JP', 'KR', 'CN', 'IN', 'BR', 'MX', 'AR', 'CL',
  'ZA', 'RU', 'UA', 'TR', 'IL', 'AE', 'SA', 'SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'HK',
  'TW', 'MO',
]);

const CURRENCY_CODES = new Set([
  'GBP', 'USD', 'EUR', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'INR', 'BRL', 'ZAR', 'PLN',
  'DKK', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'PHP', 'AED', 'MYR', 'RON',
  'RUB', 'SAR', 'TWD', 'ARS', 'CLP', 'PEN', 'COP', 'VND', 'BDT', 'EGP',
  'NGN', 'PKR', 'QAR', 'KWD', 'OMR', 'BHD', 'JOD', 'LKR', 'MAD', 'DZD',
  'KZT', 'UZS', 'GEL', 'MDL', 'BYN', 'AZN', 'AMD', 'KGS', 'TJS', 'TMT',
  'MNT', 'BAM', 'MKD', 'RSD', 'ALL', 'XOF', 'XAF', 'CDF', 'GNF', 'HTG',
  'MGA', 'LRD', 'LSL', 'MWK', 'MUR', 'MZN', 'NAD', 'RWF', 'SCR', 'SLL',
  'SOS', 'SSP', 'SZL', 'TND', 'UGX', 'ZMW', 'ZWL', 'ANG', 'AWG', 'BBD',
  'BMD', 'BSD', 'BZD', 'CUC', 'KYD', 'XCD', 'FJD', 'TTD', 'TVD', 'VES',
  'XPF', 'YER', 'WST',
]);

/** Guard: country codes and currency codes are not IP addresses. */
function guardIP(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.length <= 3 && (COUNTRY_CODES.has(trimmed) || CURRENCY_CODES.has(trimmed))) {
    return null;
  }
  return raw.trim() || null;
}

/** Guard: card_last4 containing a dot is an IP address masquerading as a card. */
function guardCardLast4(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.includes('.')) return null;
  return trimmed || null;
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export function linkIdentities(input: LinkerOrderInput[]): LinkerResult {
  // Step 1 — normalise. No comparisons yet.
  const normalised: NormalisedOrder[] = input.map((row) => {
    const ship = row.shipping_address ?? row.address ?? null;
    const bill = row.billing_address ?? null;
    const shipTokens = normaliseAddress(ship);
    const billTokens = normaliseAddress(bill);
    const norm: NormalisedOrder = {
      order_id: row.order_id,
      email: normaliseEmail(row.email),
      email_username: emailUsername(row.email),
      email_domain: row.email ? row.email.toLowerCase().split('@')[1]?.trim() ?? null : null,
      phone: normalisePhone(row.phone),
      phone_partial: phonePartial(normalisePhone(row.phone)),
      card: normaliseCard(guardCardLast4(row.card_last4), row.card_bin, row.card_fingerprint),
      ip: guardIP(row.ip),
      ip_subnet: ipSubnet(guardIP(row.ip)),
      postcode: normalisePostcode(row.postcode),
      postcode_outward: postcodeOutward(normalisePostcode(row.postcode)),
      device: row.device_fingerprint ? row.device_fingerprint.trim() : null,
      account: row.account_id ? row.account_id.trim() : null,
      name: normaliseName(row.name),
      name_bucket: null,
      shipping_full: shipTokens.length > 0 ? shipTokens.join(' ') : null,
      shipping_tokens: shipTokens,
      billing_full: billTokens.length > 0 ? billTokens.join(' ') : null,
      billing_tokens: billTokens,
    };
    norm.name_bucket = norm.name ? nameFuzzyBucket(norm.name) : null;
    return norm;
  });

  // Step 2 — indexes.
  const ix = buildIndexes(normalised);

  // Step 3 — candidate pairs. Only from groups with >= 2 orders.
  const pairs = new Map<string, PairAccumulator>();

  // Stage 1 — Strong signals: unrestricted candidate generation.
  addSignalPairsFrom(ix.card,           'card',             pairs);
  addSignalPairsFrom(ix.phone,          'phone',            pairs);
  addSignalPairsFrom(ix.device,         'device',           pairs);
  addSignalPairsFrom(ix.account,        'account',          pairs);
  addSignalPairsFrom(ix.email,          'email',            pairs);
  addSignalPairsFrom(ix.shipping_full,  'shipping_address', pairs, 200);
  addSignalPairsFrom(ix.billing_full,   'billing_address',  pairs, 200);

  // Stage 2 — Weak signals: localized expansion around suspicious nodes.
  const diags = [
    ...addWeakSignalPairsSelective(ix.phone_partial,    'phone',    pairs, 50, 25),
    ...addWeakSignalPairsSelective(ix.name,             'name',     pairs, 50, 25),
    ...addWeakSignalPairsSelective(ix.name_bucket,      'name',     pairs, 50, 25),
    ...addWeakSignalPairsSelective(ix.email_username,   'email',    pairs, 50, 25),
    ...addWeakSignalPairsSelective(ix.postcode,         'postcode', pairs, 50, 25),
    ...addWeakSignalPairsSelective(ix.postcode_outward, 'postcode', pairs, 50, 25),
    ...addWeakSignalPairsSelective(ix.ip,               'ip',       pairs, 50, 25),
    ...addWeakSignalPairsSelective(ix.ip_subnet,        'ip',       pairs, 50, 25),
  ];
  const allDiagnostics = diags;

  // Build a quick lookup so scorePair can access the normalised data per id.
  const byId = new Map(normalised.map((o) => [o.order_id, o]));

  // Detect shipping↔billing cross-matches up front.
  function isCrossAddressMatch(a: NormalisedOrder, b: NormalisedOrder): boolean {
    if (a.shipping_full && b.billing_full && a.shipping_full === b.billing_full) return true;
    if (b.shipping_full && a.billing_full && b.shipping_full === a.billing_full) return true;
    return false;
  }

  // Step 4 — score each pair.
  const candidatePairs: CandidatePair[] = [];
  const linkedPairs: { a: string; b: string; score: number; signals: LinkerSignal[]; evidence: string[] }[] = [];

  // Pre-count for diagnostics.
  let skippedByAnchor = 0;

  for (const acc of Array.from(pairs.values())) {
    // Fast-path: if no strict personal signal (phone/device/account/email/card)
    // is in the accumulated signal set, scorePair ALWAYS returns score=0 due to
    // the anchor rule. These signals are always indexed — any pair sharing such
    // a value has it in acc.signals already. Skipping saves >90% of scorePair
    // calls on real-world data where most pairs share only name/postcode/ip.
    if (
      !acc.signals.has('card') &&
      !acc.signals.has('phone') &&
      !acc.signals.has('device') &&
      !acc.signals.has('account') &&
      !acc.signals.has('email')
    ) {
      skippedByAnchor++;
      continue;
    }

    const oa = byId.get(acc.order_id_a)!;
    const ob = byId.get(acc.order_id_b)!;
    const cross = isCrossAddressMatch(oa, ob);
    const { score, signals, evidence } = scorePair(oa, ob, cross, ix);
    if (score === 0) continue;

    if (score >= POSSIBLE_THRESHOLD) {
      candidatePairs.push({
        order_id_a: acc.order_id_a,
        order_id_b: acc.order_id_b,
        score,
        signals,
        evidence,
      });
    }
    if (score >= LINK_THRESHOLD) {
      linkedPairs.push({ a: acc.order_id_a, b: acc.order_id_b, score, signals, evidence });
    }
  }

  // Stable ordering for debugging reproducibility.
  candidatePairs.sort((p, q) => {
    if (q.score !== p.score) return q.score - p.score;
    if (p.order_id_a !== q.order_id_a) return p.order_id_a < q.order_id_a ? -1 : 1;
    return p.order_id_b < q.order_id_b ? -1 : 1;
  });

  // Step 5 — union-find over the LINKED pairs only (>= threshold).
  const uf = new UnionFind();
  for (const p of linkedPairs) {
    uf.union(p.a, p.b);
  }

  const directLinkedKeys = new Set(linkedPairs.map((p) => pairKey(p.a, p.b)));
  const directRootMembers = new Map<string, string[]>();
  for (const row of normalised) {
    const root = uf.find(row.order_id);
    const members = directRootMembers.get(root) ?? [];
    members.push(row.order_id);
    directRootMembers.set(root, members);
  }

  type ChainEdge = {
    a: string;
    b: string;
    rootA: string;
    rootB: string;
    score: number;
    signals: LinkerSignal[];
    evidence: string[];
  };

  const chainEdges: ChainEdge[] = [];
  for (const acc of Array.from(pairs.values())) {
    if (directLinkedKeys.has(pairKey(acc.order_id_a, acc.order_id_b))) continue;

    const rootA = uf.find(acc.order_id_a);
    const rootB = uf.find(acc.order_id_b);
    if (rootA === rootB) continue;

    const oa = byId.get(acc.order_id_a)!;
    const ob = byId.get(acc.order_id_b)!;
    const cross = isCrossAddressMatch(oa, ob);
    const chainScore = scorePair(oa, ob, cross, ix, {
      allowWeakOnly: true,
      applyFrequencyPenalty: false,
    });
    if (chainScore.score < POSSIBLE_THRESHOLD || chainScore.signals.length === 0) continue;

    candidatePairs.push({
      order_id_a: acc.order_id_a,
      order_id_b: acc.order_id_b,
      score: chainScore.score,
      signals: chainScore.signals,
      evidence: chainScore.evidence,
    });
    if (!isGraphChainEdgeEligible(chainScore.score, chainScore.evidence)) continue;

    chainEdges.push({
      a: acc.order_id_a,
      b: acc.order_id_b,
      rootA,
      rootB,
      score: chainScore.score,
      signals: chainScore.signals,
      evidence: chainScore.evidence,
    });
  }

  if (chainEdges.length > 0) {
    const chainUf = new UnionFind();
    for (const edge of chainEdges) {
      chainUf.union(edge.rootA, edge.rootB);
    }

    const chainComponents = new Map<string, { roots: Set<string>; edges: ChainEdge[] }>();
    for (const edge of chainEdges) {
      const root = chainUf.find(edge.rootA);
      const component = chainComponents.get(root) ?? { roots: new Set<string>(), edges: [] };
      component.roots.add(edge.rootA);
      component.roots.add(edge.rootB);
      component.edges.push(edge);
      chainComponents.set(root, component);
    }

    let promotedChains = 0;
    for (const component of chainComponents.values()) {
      const memberOrderIds = Array.from(component.roots).flatMap((root) => directRootMembers.get(root) ?? [root]);

      const familyWeights = new Map<LinkerSignal, number>();
      const evidence = new Set<string>();
      for (const edge of component.edges) {
        for (const item of edge.evidence) evidence.add(item);
        for (const [family, weight] of bestEvidenceWeights(edge.evidence)) {
          if (weight > (familyWeights.get(family) ?? 0)) familyWeights.set(family, weight);
        }
      }

      const aggregateScore = Array.from(familyWeights.values()).reduce((sum, weight) => sum + weight, 0);
      if (!hasAccountGraphCorroboration(evidence)) continue;
      if (!hasGraphIdentityContinuity(evidence)) continue;
      if (aggregateScore < LINK_THRESHOLD) continue;
      if (hasStableIdentityConflict(memberOrderIds, byId, evidence)) continue;

      const roots = Array.from(component.roots).sort();
      const signals = Array.from(familyWeights.keys()).sort((a, b) => familyMaxScore(b) - familyMaxScore(a));
      const evidenceSummary = Array.from(evidence).sort();
      for (let i = 1; i < roots.length; i++) {
        linkedPairs.push({
          a: roots[0],
          b: roots[i],
          score: aggregateScore,
          signals,
          evidence: evidenceSummary,
        });
        uf.union(roots[0], roots[i]);
      }
      promotedChains++;
    }

    if (promotedChains > 0) {
      console.log(`[linker] graph-chain linking: promoted ${promotedChains} component(s) from ${chainEdges.length} weak candidate edge(s)`);
    }

    const rescueMembers = new Map<string, string[]>();
    for (const row of normalised) {
      const root = uf.find(row.order_id);
      const members = rescueMembers.get(root) ?? [];
      members.push(row.order_id);
      rescueMembers.set(root, members);
    }

    let rescuedEdges = 0;
    const rescueCandidates = chainEdges
      .filter((edge) => isHighConfidenceGraphEdge(edge.evidence, edge.score))
      .sort((a, b) => b.score - a.score);

    for (const edge of rescueCandidates) {
      const rootA = uf.find(edge.a);
      const rootB = uf.find(edge.b);
      if (rootA === rootB) continue;
      const membersA = rescueMembers.get(rootA) ?? [rootA];
      const membersB = rescueMembers.get(rootB) ?? [rootB];
      const combinedMembers = [...membersA, ...membersB];
      if (hasStableIdentityConflict(combinedMembers, byId, new Set(edge.evidence))) continue;

      linkedPairs.push({
        a: rootA,
        b: rootB,
        score: edge.score,
        signals: edge.signals,
        evidence: edge.evidence,
      });
      uf.union(rootA, rootB);
      const newRoot = uf.find(rootA);
      rescueMembers.delete(rootA);
      rescueMembers.delete(rootB);
      rescueMembers.set(newRoot, combinedMembers);
      rescuedEdges++;
    }

    if (rescuedEdges > 0) {
      console.log(`[linker] graph-edge rescue: promoted ${rescuedEdges} high-confidence edge(s)`);
    }
  }

  // Group orders by root; also track per-cluster max score, signal union, evidence union.
  const clusterMembers = new Map<string, Set<string>>();
  const clusterMaxScore = new Map<string, number>();
  const clusterSignals = new Map<string, Set<LinkerSignal>>();
  const clusterEvidence = new Map<string, Set<string>>();

  for (const p of linkedPairs) {
    const root = uf.find(p.a);
    if (!clusterMembers.has(root)) {
      clusterMembers.set(root, new Set());
      clusterMaxScore.set(root, 0);
      clusterSignals.set(root, new Set());
      clusterEvidence.set(root, new Set());
    }
    clusterMembers.get(root)!.add(p.a);
    clusterMembers.get(root)!.add(p.b);
    if (p.score > clusterMaxScore.get(root)!) clusterMaxScore.set(root, p.score);
    for (const s of p.signals) clusterSignals.get(root)!.add(s);
    for (const ev of p.evidence) clusterEvidence.get(root)!.add(ev);
  }

  const clusters: LinkedCluster[] = [];
  for (const [root, members] of Array.from(clusterMembers.entries())) {
    const orderIds = Array.from(members).sort();
    clusters.push({
      cluster_id: deterministicClusterId(orderIds),
      order_ids: orderIds,
      confidence_score: clusterMaxScore.get(root)!,
      signals_matched: Array.from(clusterSignals.get(root)!).sort(
        (a, b) => familyMaxScore(b) - familyMaxScore(a)
      ),
      evidence_summary: Array.from(clusterEvidence.get(root)!).sort(),
    });
  }

  // Stable cluster ordering by first member id.
  clusters.sort((a, b) => (a.order_ids[0] < b.order_ids[0] ? -1 : 1));

  // Log diagnostics for every large skipped/selective group so operators
  // can verify the expansion strategy is working as intended.
  if (allDiagnostics.length > 0) {
    const summary = allDiagnostics.reduce(
      (acc, d) => {
        acc.totalSkippedCartesian += d.skippedCartesianPairs;
        acc.totalEvaluated += d.evaluatedPairs;
        if (d.strategy === 'localized_expansion') acc.localizedGroups++;
        else acc.fullySkippedGroups++;
        return acc;
      },
      { totalSkippedCartesian: 0, totalEvaluated: 0, localizedGroups: 0, fullySkippedGroups: 0 }
    );
    console.log(
      `[linker] weak-signal expansion: ${allDiagnostics.length} large group(s) — ` +
      `${summary.localizedGroups} localized (${summary.totalEvaluated} pairs evaluated), ` +
      `${summary.fullySkippedGroups} fully skipped (no suspicious anchors), ` +
      `${summary.totalSkippedCartesian.toLocaleString()} Cartesian pairs avoided`
    );
    for (const d of allDiagnostics) {
      console.log(
        `[linker]   signal=${d.signal} groupSize=${d.groupSize} ` +
        `strategy=${d.strategy} evaluatedPairs=${d.evaluatedPairs} ` +
        `skippedCartesianPairs=${d.skippedCartesianPairs.toLocaleString()}`
      );
    }
  }

  console.log(
    `[linker] step-4 scoring: ${pairs.size.toLocaleString()} total pairs, ` +
    `${skippedByAnchor.toLocaleString()} skipped by anchor fast-path (no personal signal), ` +
    `${(pairs.size - skippedByAnchor).toLocaleString()} actually scored`
  );

  return { clusters, candidatePairs, diagnostics: allDiagnostics };
}
