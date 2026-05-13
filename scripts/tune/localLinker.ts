/**
 * Local Linker — parameterized copy of lib/linker.ts scoring logic.
 *
 * This is intentionally NOT imported from lib/linker.ts because the tuning
 * loop needs to adjust the signal weights and link threshold at runtime
 * without modifying the production source. The algorithm is identical;
 * only the constants are extracted into TuneConfig.
 *
 * Any logic change here must be mirrored from lib/linker.ts.
 */
import { createHash } from 'crypto';
import type { TuneConfig } from './types';

// ---------------------------------------------------------------------------
// Input / output shapes (mirrors lib/linker.ts public API)
// ---------------------------------------------------------------------------

export interface LocalLinkerInput {
  order_id: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  postcode?: string | null;
  ip?: string | null;
  card_last4?: string | null;
  card_bin?: string | null;
  card_fingerprint?: string | null;
  device_fingerprint?: string | null;
  account_id?: string | null;
  name?: string | null;
}

export type LinkerSignal =
  | 'card' | 'phone' | 'device' | 'account' | 'email'
  | 'postcode' | 'ip' | 'name' | 'shipping_address' | 'billing_address';

export interface LinkedCluster {
  cluster_id: string;
  order_ids: string[];
  confidence_score: number;
  signals_matched: LinkerSignal[];
  evidence_summary: string[];
}

export interface LocalLinkedPair {
  a: string;
  b: string;
  score: number;
  signals: LinkerSignal[];
  evidence: string[];
}

export interface LocalLinkerResult {
  clusters: LinkedCluster[];
  /** Maps orderId → cluster_id (null if not linked to anyone). */
  orderToCluster: Map<string, string>;
  /** Direct pair decisions used for failure analysis and audit logs. */
  linkedPairs: LocalLinkedPair[];
}

// ---------------------------------------------------------------------------
// Normalisation helpers (mirrors lib/linker.ts normalisation)
// ---------------------------------------------------------------------------

function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const localPart = lower.slice(0, at).split('+')[0].replace(/\./g, '');
  const domain = lower.slice(at + 1);
  if (!localPart) return null;
  return `${localPart}@${domain}`;
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

function normaliseAddress(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const ABBR: Record<string, string> = {
    st: 'street', rd: 'road', ave: 'avenue', av: 'avenue', ln: 'lane',
    cl: 'close', dr: 'drive', blvd: 'boulevard', ct: 'court', pl: 'place',
    sq: 'square', apt: 'apartment',
  };
  return cleaned.split(' ').map((t) => ABBR[t] ?? t).sort();
}

function normaliseAddressFull(raw: string | null | undefined): string | null {
  const t = normaliseAddress(raw);
  return t.length > 0 ? t.join(' ') : null;
}

function normalisePostcode(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.toUpperCase().replace(/\s+/g, '');
}

function postcodeOutward(pc: string): string | null {
  if (!pc) return null;
  const m = pc.match(/^([A-Z]{1,2}\d[A-Z\d]?)\d[A-Z]{2}$/);
  return m ? m[1] : null;
}

function normaliseCard(
  last4: string | null | undefined,
  bin?: string | null,
  fp?: string | null
): string | null {
  const fingerprint = (fp ?? '').trim().toLowerCase();
  if (fingerprint) {
    const h = createHash('sha256').update(fingerprint).digest('hex');
    return `fp:${h}`;
  }
  const digits4 = (last4 ?? '').replace(/\D/g, '').slice(-4);
  if (digits4.length !== 4) return null;
  const digitsBin = (bin ?? '').replace(/\D/g, '').slice(0, 8);
  return digitsBin.length >= 6 ? `${digitsBin}-${digits4}` : digits4;
}

function normaliseName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toLowerCase().replace(/[^a-z\s,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) return `${parts[1]} ${parts[0]}`.replace(/\s+/g, ' ').trim();
  }
  return cleaned.replace(/,/g, '').replace(/\s+/g, ' ').trim() || null;
}

function emailUsername(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const at = raw.toLowerCase().indexOf('@');
  if (at < 1) return null;
  const local = raw.toLowerCase().slice(0, at);
  const alpha = local.replace(/[^a-z]/g, '');
  return alpha.length >= 4 ? alpha : null;
}

function emailDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.toLowerCase().split('@')[1]?.trim() ?? null;
}

function phonePartial(norm: string | null): string | null {
  if (!norm || norm.length < 7) return null;
  return norm.slice(-7);
}

function ipSubnet(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  return m ? m[1] : null;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
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

function nameFuzzyBucket(name: string): string | null {
  if (!name) return null;
  const tokens = name.split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  const first = tokens[0].slice(0, 3);
  const last = tokens.length > 1 ? tokens[tokens.length - 1].slice(0, 3) : '';
  return `${first}${last}` || null;
}

function jaccardTokens(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const aSet = new Set(a.filter((t) => t.length > 1));
  const bSet = new Set(b.filter((t) => t.length > 1));
  if (!aSet.size || !bSet.size) return 0;
  let inter = 0;
  for (const t of aSet) if (bSet.has(t)) inter++;
  const union = aSet.size + bSet.size - inter;
  return union === 0 ? 0 : inter / union;
}

function deterministicClusterId(orderIds: string[]): string {
  const sorted = [...orderIds].sort();
  const h = createHash('sha256').update(sorted.join('|')).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function guardIP(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase();
  if (t.length <= 3) return null; // guard country/currency codes
  return raw.trim() || null;
}

function guardCard(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t.includes('.')) return null; // IP masquerading as card
  return t || null;
}

// ---------------------------------------------------------------------------
// Normalised order shape (internal)
// ---------------------------------------------------------------------------

interface NormOrder {
  order_id: string;
  email: string | null;
  email_username: string | null;
  email_domain: string | null;
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

// ---------------------------------------------------------------------------
// Index helpers
// ---------------------------------------------------------------------------

type Idx = Map<string, string[]>;

function pushIdx(idx: Idx, key: string | null | undefined, id: string): void {
  if (!key) return;
  const arr = idx.get(key);
  if (arr) arr.push(id);
  else idx.set(key, [id]);
}

// ---------------------------------------------------------------------------
// Pair accumulator
// ---------------------------------------------------------------------------

interface PairAcc {
  order_id_a: string;
  order_id_b: string;
  signals: Set<LinkerSignal>;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function addPair(a: string, b: string, sig: LinkerSignal, pairs: Map<string, PairAcc>): void {
  const key = pairKey(a, b);
  let acc = pairs.get(key);
  if (!acc) {
    acc = { order_id_a: a < b ? a : b, order_id_b: a < b ? b : a, signals: new Set() };
    pairs.set(key, acc);
  }
  acc.signals.add(sig);
}

function addPairsFromIdx(idx: Idx, sig: LinkerSignal, pairs: Map<string, PairAcc>, max = 500): void {
  for (const ids of idx.values()) {
    if (ids.length < 2 || ids.length > max) continue;
    const u = Array.from(new Set(ids));
    for (let i = 0; i < u.length; i++)
      for (let j = i + 1; j < u.length; j++)
        addPair(u[i], u[j], sig, pairs);
  }
}

function addWeakPairsSelective(
  idx: Idx, sig: LinkerSignal, pairs: Map<string, PairAcc>,
  maxGroup = 50, maxExpand = 25
): void {
  const suspicious = new Set<string>();
  for (const acc of pairs.values()) {
    suspicious.add(acc.order_id_a);
    suspicious.add(acc.order_id_b);
  }
  for (const ids of idx.values()) {
    if (ids.length < 2) continue;
    const u = Array.from(new Set(ids));
    if (u.length <= maxGroup) {
      for (let i = 0; i < u.length; i++)
        for (let j = i + 1; j < u.length; j++)
          addPair(u[i], u[j], sig, pairs);
    } else {
      const anchors = u.filter((id) => suspicious.has(id));
      for (const anchor of anchors) {
        const candidates = u.filter((id) => id !== anchor).slice(0, maxExpand);
        for (const c of candidates) addPair(anchor, c, sig, pairs);
      }
    }
  }
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

function signalFrequency(idx: Idx, key: string | null | undefined): number {
  if (!key) return 0;
  return idx.get(key)?.length ?? 0;
}

function independenceGroup(family: LinkerSignal, tier: string): IndependenceGroup {
  if (family === 'card') return 'payment';
  if (family === 'device' || family === 'ip') return 'network_device';
  if (family === 'shipping_address' || family === 'billing_address' || family === 'postcode') return 'location';
  if (family === 'name') return 'name';
  return 'contact';
}

function isWeakOrCollisionProne(family: LinkerSignal, tier: string): boolean {
  if (family === 'name' || family === 'postcode' || family === 'ip') return true;
  if (family === 'shipping_address' || family === 'billing_address') return true;
  if (family === 'email' && tier !== 'exact') return true;
  if (family === 'phone' && tier !== 'exact') return true;
  if (family === 'card' && tier !== 'fingerprint') return true;
  return false;
}

function addFired(
  fired: FiredSignal[],
  family: LinkerSignal,
  tier: string,
  weight: number,
  frequency: number,
): void {
  let adjustedWeight = weight;
  if (isWeakOrCollisionProne(family, tier)) {
    if (frequency > VERY_COMMON_WEAK_SIGNAL_LIMIT) adjustedWeight = 0;
    else if (frequency > COMMON_WEAK_SIGNAL_LIMIT) adjustedWeight = Math.floor(weight * 0.4);
  }
  if (adjustedWeight <= 0) return;
  fired.push({
    family,
    tier,
    weight: adjustedWeight,
    independenceGroup: independenceGroup(family, tier),
    frequency,
  });
}

function isExactEmail(f: FiredSignal): boolean {
  return f.family === 'email' && f.tier === 'exact';
}

function isStrongPersonalAnchor(f: FiredSignal): boolean {
  if (f.family === 'phone' && f.tier === 'exact') return true;
  if (f.family === 'device' && f.tier === 'exact') return true;
  if (f.family === 'account' && f.tier === 'exact') return true;
  if (f.family === 'card' && f.tier === 'fingerprint') return true;
  return isExactEmail(f);
}

// ---------------------------------------------------------------------------
// Main export: linkIdentitiesLocal
// ---------------------------------------------------------------------------

export function linkIdentitiesLocal(
  input: LocalLinkerInput[],
  cfg: TuneConfig
): LocalLinkerResult {
  // Step 1 — normalise
  const normalised: NormOrder[] = input.map((row) => {
    const ship = row.shipping_address ?? row.address ?? null;
    const bill = row.billing_address ?? null;
    const shipTokens = normaliseAddress(ship);
    const billTokens = normaliseAddress(bill);
    const phonNorm = normalisePhone(row.phone);
    const n: NormOrder = {
      order_id: row.order_id,
      email: normaliseEmail(row.email),
      email_username: emailUsername(row.email),
      email_domain: emailDomain(row.email),
      phone: phonNorm,
      phone_partial: phonePartial(phonNorm),
      card: normaliseCard(guardCard(row.card_last4), row.card_bin, row.card_fingerprint),
      ip: guardIP(row.ip),
      ip_subnet: ipSubnet(guardIP(row.ip)),
      postcode: normalisePostcode(row.postcode),
      postcode_outward: postcodeOutward(normalisePostcode(row.postcode ?? '')),
      device: row.device_fingerprint ? row.device_fingerprint.trim() : null,
      account: row.account_id ? row.account_id.trim() : null,
      name: normaliseName(row.name),
      name_bucket: null,
      shipping_full: shipTokens.length > 0 ? shipTokens.join(' ') : null,
      shipping_tokens: shipTokens,
      billing_full: billTokens.length > 0 ? billTokens.join(' ') : null,
      billing_tokens: billTokens,
    };
    n.name_bucket = n.name ? nameFuzzyBucket(n.name) : null;
    return n;
  });

  // Step 2 — indexes
  const ix = {
    email: new Map<string, string[]>(),
    email_username: new Map<string, string[]>(),
    phone: new Map<string, string[]>(),
    phone_partial: new Map<string, string[]>(),
    card: new Map<string, string[]>(),
    ip: new Map<string, string[]>(),
    ip_subnet: new Map<string, string[]>(),
    postcode: new Map<string, string[]>(),
    postcode_outward: new Map<string, string[]>(),
    device: new Map<string, string[]>(),
    account: new Map<string, string[]>(),
    name: new Map<string, string[]>(),
    name_bucket: new Map<string, string[]>(),
    shipping_full: new Map<string, string[]>(),
    billing_full: new Map<string, string[]>(),
  };
  for (const o of normalised) {
    pushIdx(ix.email,            o.email,            o.order_id);
    pushIdx(ix.email_username,   o.email_username,   o.order_id);
    pushIdx(ix.phone,            o.phone,            o.order_id);
    pushIdx(ix.phone_partial,    o.phone_partial,    o.order_id);
    pushIdx(ix.card,             o.card,             o.order_id);
    pushIdx(ix.ip,               o.ip,               o.order_id);
    pushIdx(ix.ip_subnet,        o.ip_subnet,        o.order_id);
    pushIdx(ix.postcode,         o.postcode || null, o.order_id);
    pushIdx(ix.postcode_outward, o.postcode_outward, o.order_id);
    pushIdx(ix.device,           o.device,           o.order_id);
    pushIdx(ix.account,          o.account,          o.order_id);
    pushIdx(ix.name,             o.name,             o.order_id);
    pushIdx(ix.name_bucket,      o.name_bucket,      o.order_id);
    pushIdx(ix.shipping_full,    o.shipping_full,    o.order_id);
    pushIdx(ix.billing_full,     o.billing_full,     o.order_id);
  }

  // Step 3 — candidate pairs
  const pairs = new Map<string, PairAcc>();
  // Strong signals — unrestricted (these are the only ones that can anchor a link)
  addPairsFromIdx(ix.card,           'card',             pairs);
  addPairsFromIdx(ix.phone,          'phone',            pairs);
  addPairsFromIdx(ix.device,         'device',           pairs);
  addPairsFromIdx(ix.account,        'account',          pairs);
  addPairsFromIdx(ix.email,          'email',            pairs);
  addPairsFromIdx(ix.shipping_full,  'shipping_address', pairs, 200);
  addPairsFromIdx(ix.billing_full,   'billing_address',  pairs, 200);
  // Weak signals — only expand pairs already seeded by a strong signal above.
  // name / email_username can have thousands of orders per bucket (common names /
  // usernames), generating O(n²) pairs that will never reach the link threshold
  // alone. Use selective expansion so they only annotate already-known pairs.
  addWeakPairsSelective(ix.phone_partial, 'phone', pairs);
  addWeakPairsSelective(ix.name,          'name',  pairs);
  addWeakPairsSelective(ix.name_bucket,   'name',  pairs);
  addWeakPairsSelective(ix.email_username,'email', pairs);
  addWeakPairsSelective(ix.postcode,      'postcode', pairs);
  addWeakPairsSelective(ix.postcode_outward, 'postcode', pairs);
  addWeakPairsSelective(ix.ip,            'ip', pairs);
  addWeakPairsSelective(ix.ip_subnet,     'ip', pairs);

  const byId = new Map(normalised.map((o) => [o.order_id, o]));

  function isCrossAddr(a: NormOrder, b: NormOrder): boolean {
    if (a.shipping_full && b.billing_full && a.shipping_full === b.billing_full) return true;
    if (b.shipping_full && a.billing_full && b.shipping_full === a.billing_full) return true;
    return false;
  }

  // Step 4 — score each pair using configurable weights
  function scorePair(
    a: NormOrder, b: NormOrder, crossAddr: boolean
  ): { score: number; signals: LinkerSignal[]; evidence: string[] } {
    const fired: FiredSignal[] = [];

    // phone
    if (a.phone && b.phone && a.phone === b.phone)
      addFired(fired, 'phone', 'exact', cfg.phone_exact, signalFrequency(ix.phone, a.phone));
    else if (a.phone_partial && b.phone_partial && a.phone_partial === b.phone_partial)
      addFired(fired, 'phone', 'partial', cfg.phone_partial, signalFrequency(ix.phone_partial, a.phone_partial));

    // device
    if (a.device && b.device && a.device === b.device)
      addFired(fired, 'device', 'exact', cfg.device_exact, signalFrequency(ix.device, a.device));

    // account
    if (a.account && b.account && a.account === b.account)
      addFired(fired, 'account', 'exact', cfg.account_exact, signalFrequency(ix.account, a.account));

    // shipping_address
    if (a.shipping_full && b.shipping_full && a.shipping_full === b.shipping_full)
      addFired(fired, 'shipping_address', 'exact', cfg.shipping_exact, signalFrequency(ix.shipping_full, a.shipping_full));
    else if (a.shipping_tokens.length > 0 && b.shipping_tokens.length > 0) {
      if (jaccardTokens(a.shipping_tokens, b.shipping_tokens) >= 0.75)
        addFired(fired, 'shipping_address', 'partial', cfg.shipping_partial, 0);
    }

    // billing_address
    if (a.billing_full && b.billing_full && a.billing_full === b.billing_full)
      addFired(fired, 'billing_address', 'exact', cfg.billing_exact, signalFrequency(ix.billing_full, a.billing_full));
    else if (a.billing_tokens.length > 0 && b.billing_tokens.length > 0) {
      if (jaccardTokens(a.billing_tokens, b.billing_tokens) >= 0.75)
        addFired(fired, 'billing_address', 'partial', cfg.billing_partial, 0);
    }
    if (crossAddr)
      addFired(fired, 'billing_address', 'cross', cfg.billing_cross, 0);

    // email
    if (a.email && b.email && a.email === b.email)
      addFired(fired, 'email', 'exact', cfg.email_exact, signalFrequency(ix.email, a.email));
    else if (
      a.email_username && b.email_username && a.email_username === b.email_username &&
      a.email_domain && b.email_domain && a.email_domain !== b.email_domain
    )
      addFired(fired, 'email', 'username', cfg.email_username, signalFrequency(ix.email_username, a.email_username));

    // name
    if (a.name && b.name && a.name === b.name)
      addFired(fired, 'name', 'exact', cfg.name_exact, signalFrequency(ix.name, a.name));
    else if (
      a.name && b.name && a.name.length >= 6 && b.name.length >= 6 &&
      a.name_bucket && a.name_bucket === b.name_bucket &&
      levenshtein(a.name, b.name) <= 2
    )
      addFired(fired, 'name', 'fuzzy', cfg.name_fuzzy, signalFrequency(ix.name_bucket, a.name_bucket));

    // card
    if (a.card && b.card && a.card === b.card) {
      const tier = a.card.startsWith('fp:')
        ? 'fingerprint'
        : (a.card.includes('-') ? 'full' : 'last4');
      const weight = tier === 'fingerprint'
        ? cfg.card_fingerprint
        : (tier === 'full' ? cfg.card_full : cfg.card_last4);
      addFired(fired, 'card', tier, weight, signalFrequency(ix.card, a.card));
    }

    // postcode
    if (a.postcode && b.postcode && a.postcode === b.postcode)
      addFired(fired, 'postcode', 'full', cfg.postcode_full, signalFrequency(ix.postcode, a.postcode));
    else if (a.postcode_outward && b.postcode_outward && a.postcode_outward === b.postcode_outward)
      addFired(fired, 'postcode', 'outward', cfg.postcode_outward, signalFrequency(ix.postcode_outward, a.postcode_outward));

    // ip
    if (a.ip && b.ip && a.ip === b.ip)
      addFired(fired, 'ip', 'exact', cfg.ip_exact, signalFrequency(ix.ip, a.ip));
    else if (a.ip_subnet && b.ip_subnet && a.ip_subnet === b.ip_subnet)
      addFired(fired, 'ip', 'subnet', cfg.ip_subnet, signalFrequency(ix.ip_subnet, a.ip_subnet));

    const hasExactEmail = fired.some(isExactEmail);
    if (!hasExactEmail) {
      const hasStrongAnchor = fired.some(isStrongPersonalAnchor);
      if (!hasStrongAnchor) return { score: 0, signals: [], evidence: [] };

      const independentGroups = new Set(fired.map((f) => f.independenceGroup));
      if (independentGroups.size < 2) return { score: 0, signals: [], evidence: [] };
    }

    const rawScore = fired.reduce((s, f) => s + f.weight, 0);
    const score = hasExactEmail ? Math.max(rawScore, cfg.LINK_THRESHOLD) : rawScore;
    const familyOrder = (f: LinkerSignal) => {
      const w: Partial<Record<LinkerSignal,number>> = {
        device: 30, phone: 30, card: 30, account: 25,
        shipping_address: 22, billing_address: 22, email: 20,
        name: 18, postcode: 10, ip: 8,
      };
      return w[f] ?? 0;
    };
    const signals = Array.from(new Set(fired.map((f) => f.family))).sort(
      (x, y) => familyOrder(y) - familyOrder(x)
    );
    const evidence = fired.sort((x,y) => y.weight - x.weight).map((f) => `${f.family}:${f.tier}`);
    return { score, signals, evidence };
  }

  const linkedPairs: LocalLinkedPair[] = [];

  for (const acc of pairs.values()) {
    // Fast-path: anchor rule pre-check
    if (!acc.signals.has('card') && !acc.signals.has('phone') &&
        !acc.signals.has('device') && !acc.signals.has('account') &&
        !acc.signals.has('email'))
      continue;

    const oa = byId.get(acc.order_id_a)!;
    const ob = byId.get(acc.order_id_b)!;
    const cross = isCrossAddr(oa, ob);
    const { score, signals, evidence } = scorePair(oa, ob, cross);
    if (score >= cfg.LINK_THRESHOLD) {
      linkedPairs.push({ a: acc.order_id_a, b: acc.order_id_b, score, signals, evidence });
    }
  }

  // Step 5 — union-find
  const parent = new Map<string, string>();
  function find(x: string): string {
    let p = parent.get(x) ?? x;
    if (p !== x) {
      p = find(p);
      parent.set(x, p);
    }
    return p;
  }
  function union(a: string, b: string): void {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (ra < rb) parent.set(rb, ra);
    else parent.set(ra, rb);
  }
  for (const p of linkedPairs) union(p.a, p.b);

  // Group into clusters
  const clusterMembers = new Map<string, Set<string>>();
  const clusterMaxScore = new Map<string, number>();
  const clusterSignals = new Map<string, Set<LinkerSignal>>();
  const clusterEvidence = new Map<string, Set<string>>();

  for (const p of linkedPairs) {
    const root = find(p.a);
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
  const orderToCluster = new Map<string, string>();

  for (const [root, members] of clusterMembers.entries()) {
    const orderIds = Array.from(members).sort();
    const clusterId = deterministicClusterId(orderIds);
    clusters.push({
      cluster_id: clusterId,
      order_ids: orderIds,
      confidence_score: clusterMaxScore.get(root)!,
      signals_matched: Array.from(clusterSignals.get(root)!),
      evidence_summary: Array.from(clusterEvidence.get(root)!),
    });
    for (const id of orderIds) orderToCluster.set(id, clusterId);
  }

  // Assign singleton cluster IDs for unlinked orders
  for (const row of input) {
    if (!orderToCluster.has(row.order_id)) {
      // Singleton — assign a unique cluster ID based on order_id alone
      orderToCluster.set(row.order_id, `singleton:${row.order_id}`);
    }
  }

  return { clusters, orderToCluster, linkedPairs };
}
