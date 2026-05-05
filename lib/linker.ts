/**
 * Identity Linker — single-responsibility in-batch identity clustering.
 *
 * Given a batch of orders, this module decides which orders are probably from
 * the same person. It does not score fraud, it does not make recommendations,
 * and it does not consult any persistent store.
 *
 * Pipeline (must run in this order, do not mix steps):
 *   1. NORMALISE every field.
 *   2. BUILD INDEXES grouping orders by normalised values.
 *   3. EXTRACT CANDIDATE PAIRS from multi-order index entries only.
 *   4. SCORE each candidate pair by summing the weight of every index they
 *      share. Apply special rules for IP and postcode. Name is never used.
 *   5. UNION-FIND linked pairs into clusters with deterministic cluster_ids.
 *
 * Signal weights (Step 4):
 *   card     40    strongest — tied to a physical object
 *   phone    30    requires a real SIM
 *   device   30    physical device fingerprint
 *   account  25    merchant namespace
 *   email    20    reused base w/ plus-aliases
 *   postcode 10    only ever counts alongside another signal
 *   ip        8    only ever counts alongside another signal
 *
 *   Link threshold       : 30
 *   Possible (flag only) : 15–29
 *   Ignored              : <15
 *
 * IMPORTANT: name / billing_name MUST NOT appear anywhere in scoring.
 * Address (full street text) MUST NOT be used for linking — postcode only.
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
  address?: string | null;
  postcode?: string | null;
  ip?: string | null;
  card_last4?: string | null;
  card_bin?: string | null;
  device_fingerprint?: string | null;
  account_id?: string | null;
}

export type LinkerSignal =
  | 'card'
  | 'phone'
  | 'device'
  | 'account'
  | 'email'
  | 'postcode'
  | 'ip';

export interface CandidatePair {
  order_id_a: string;
  order_id_b: string;
  score: number;
  signals: LinkerSignal[];
}

export interface LinkedCluster {
  cluster_id: string;
  order_ids: string[];
  confidence_score: number;   // max pair score observed in the cluster
  signals_matched: LinkerSignal[];
}

export interface LinkerResult {
  clusters: LinkedCluster[];
  candidatePairs: CandidatePair[];
}

// ---------------------------------------------------------------------------
// Step 1 — Normalisation. Pure, no I/O, no network.
// ---------------------------------------------------------------------------

/**
 * Email: remove dots before @, strip plus aliases, lowercase.
 *   "James.Harrison+orders@Gmail.com" → "jamesharrison@gmail.com"
 *
 * Dot-stripping is applied to ALL domains, not just Gmail, because the spec
 * instructs so. Plus-alias stripping is universal (RFC 5233 sub-addressing
 * is widely implemented — Gmail, Fastmail, ProtonMail, Apple iCloud).
 */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const localPart = lower.slice(0, at).split('+')[0].replace(/\./g, '');
  const domain = lower.slice(at + 1);
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
  bin?: string | null | undefined
): string | null {
  const digits4 = (last4 ?? '').replace(/\D/g, '').slice(-4);
  if (digits4.length !== 4) return null;
  const digitsBin = (bin ?? '').replace(/\D/g, '').slice(0, 8);
  return digitsBin.length >= 6 ? `${digitsBin}-${digits4}` : digits4;
}

// ---------------------------------------------------------------------------
// Step 2 — Indexes. A plain data structure; one pass over input.
// ---------------------------------------------------------------------------

interface NormalisedOrder {
  order_id: string;
  email: string | null;
  phone: string | null;
  card: string | null;
  ip: string | null;
  postcode: string;
  device: string | null;
  account: string | null;
}

interface Indexes {
  email: Map<string, string[]>;
  phone: Map<string, string[]>;
  card: Map<string, string[]>;
  ip: Map<string, string[]>;
  postcode: Map<string, string[]>;
  device: Map<string, string[]>;
  account: Map<string, string[]>;
}

function pushIndex(idx: Map<string, string[]>, key: string | null | undefined, orderId: string): void {
  if (!key) return;
  const arr = idx.get(key);
  if (arr) arr.push(orderId);
  else idx.set(key, [orderId]);
}

function buildIndexes(orders: NormalisedOrder[]): Indexes {
  const ix: Indexes = {
    email: new Map(),
    phone: new Map(),
    card: new Map(),
    ip: new Map(),
    postcode: new Map(),
    device: new Map(),
    account: new Map(),
  };
  for (const o of orders) {
    pushIndex(ix.email, o.email, o.order_id);
    pushIndex(ix.phone, o.phone, o.order_id);
    pushIndex(ix.card, o.card, o.order_id);
    pushIndex(ix.ip, o.ip, o.order_id);
    pushIndex(ix.postcode, o.postcode || null, o.order_id);
    pushIndex(ix.device, o.device, o.order_id);
    pushIndex(ix.account, o.account, o.order_id);
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

function addSignalPairsFrom(
  idx: Map<string, string[]>,
  signal: LinkerSignal,
  pairs: Map<string, PairAccumulator>
): void {
  for (const orderIds of Array.from(idx.values())) {
    if (orderIds.length < 2) continue;
    // Dedupe within the group — an order should only contribute once even
    // if it somehow appears twice (shouldn't, but defensive).
    const unique = Array.from(new Set(orderIds));
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = unique[i];
        const b = unique[j];
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
    }
  }
}

// ---------------------------------------------------------------------------
// Step 4 — Scoring.
// ---------------------------------------------------------------------------

const SIGNAL_WEIGHTS: Record<LinkerSignal, number> = {
  card: 40,
  phone: 30,
  device: 30,
  account: 25,
  email: 20,
  postcode: 10,
  ip: 8,
};

/** Pairs scoring >= LINK_THRESHOLD are treated as the same person. */
const LINK_THRESHOLD = 30;
/** Pairs scoring >= POSSIBLE_THRESHOLD are surfaced as possible matches. */
const POSSIBLE_THRESHOLD = 15;

/**
 * Score a pair according to the signals they share.
 * Special rules:
 *   - `ip`: never counts on its own. If `ip` is the ONLY shared signal we
 *     drop it from the signal list and return score 0.
 *   - `postcode`: never counts on its own. Same rule as `ip`.
 *
 * Returns the final numeric score plus the (possibly filtered) signal list.
 */
function scorePair(signals: Set<LinkerSignal>): { score: number; signals: LinkerSignal[] } {
  const list = Array.from(signals);
  const others = list.filter((s) => s !== 'ip' && s !== 'postcode');

  // If the only signals are IP/postcode (or one of them), they cannot anchor
  // a link on their own. Return zero — caller will drop the pair.
  if (others.length === 0) return { score: 0, signals: [] };

  let score = 0;
  for (const s of list) score += SIGNAL_WEIGHTS[s];
  // Stable order: sort by weight desc so the strongest signal reads first.
  const sorted = list.sort((a, b) => SIGNAL_WEIGHTS[b] - SIGNAL_WEIGHTS[a]);
  return { score, signals: sorted };
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

/**
 * Deterministic UUID-v4-shaped cluster identifier derived from the sorted
 * member order_ids. Same set of members → same cluster_id across runs.
 */
function deterministicClusterId(orderIds: string[]): string {
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
  const normalised: NormalisedOrder[] = input.map((row) => ({
    order_id: row.order_id,
    email: normaliseEmail(row.email),
    phone: normalisePhone(row.phone),
    card: normaliseCard(guardCardLast4(row.card_last4), row.card_bin),
    ip: guardIP(row.ip),
    postcode: normalisePostcode(row.postcode),
    device: row.device_fingerprint ? row.device_fingerprint.trim() : null,
    account: row.account_id ? row.account_id.trim() : null,
  }));

  // Step 2 — indexes.
  const ix = buildIndexes(normalised);

  // Step 3 — candidate pairs. Only from groups with >= 2 orders.
  const pairs = new Map<string, PairAccumulator>();
  addSignalPairsFrom(ix.card, 'card', pairs);
  addSignalPairsFrom(ix.phone, 'phone', pairs);
  addSignalPairsFrom(ix.device, 'device', pairs);
  addSignalPairsFrom(ix.account, 'account', pairs);
  addSignalPairsFrom(ix.email, 'email', pairs);
  addSignalPairsFrom(ix.postcode, 'postcode', pairs);
  addSignalPairsFrom(ix.ip, 'ip', pairs);

  // Step 4 — score each pair.
  const candidatePairs: CandidatePair[] = [];
  const linkedPairs: { a: string; b: string; score: number; signals: LinkerSignal[] }[] = [];

  for (const acc of Array.from(pairs.values())) {
    const { score, signals } = scorePair(acc.signals);
    if (score === 0) continue; // IP-only / postcode-only dropped
    if (score >= POSSIBLE_THRESHOLD) {
      candidatePairs.push({
        order_id_a: acc.order_id_a,
        order_id_b: acc.order_id_b,
        score,
        signals,
      });
    }
    if (score >= LINK_THRESHOLD) {
      linkedPairs.push({ a: acc.order_id_a, b: acc.order_id_b, score, signals });
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
  // Seed with every order that participates in at least one linked pair.
  for (const p of linkedPairs) {
    uf.union(p.a, p.b);
  }

  // Group orders by root; also track per-cluster max score and signal union.
  const clusterMembers = new Map<string, Set<string>>();
  const clusterMaxScore = new Map<string, number>();
  const clusterSignals = new Map<string, Set<LinkerSignal>>();

  for (const p of linkedPairs) {
    const root = uf.find(p.a);
    if (!clusterMembers.has(root)) {
      clusterMembers.set(root, new Set());
      clusterMaxScore.set(root, 0);
      clusterSignals.set(root, new Set());
    }
    clusterMembers.get(root)!.add(p.a);
    clusterMembers.get(root)!.add(p.b);
    if (p.score > clusterMaxScore.get(root)!) clusterMaxScore.set(root, p.score);
    for (const s of p.signals) clusterSignals.get(root)!.add(s);
  }

  const clusters: LinkedCluster[] = [];
  for (const [root, members] of Array.from(clusterMembers.entries())) {
    const orderIds = Array.from(members).sort();
    clusters.push({
      cluster_id: deterministicClusterId(orderIds),
      order_ids: orderIds,
      confidence_score: clusterMaxScore.get(root)!,
      signals_matched: Array.from(clusterSignals.get(root)!).sort(
        (a, b) => SIGNAL_WEIGHTS[b] - SIGNAL_WEIGHTS[a]
      ),
    });
  }

  // Stable cluster ordering by first member id.
  clusters.sort((a, b) => (a.order_ids[0] < b.order_ids[0] ? -1 : 1));

  return { clusters, candidatePairs };
}
