/**
 * v2 test-suite SSOT bridge.
 *
 * Imports the canonical production functions (lib/identity/normalise+hash,
 * lib/engine/weights) and replicates — byte-equivalent — the ONLY two pieces
 * of the identity algorithm that exist nowhere in lib/: the email_root
 * derivation and the Phase 4 union-find resolution. Both were recovered from
 * the 2026-06-11 cutover session (the workers that populated the live
 * identities/identity_members/identity_profiles tables). Per CLAUDE.md this
 * file lives under scripts/ and intentionally mirrors the migration workers;
 * it must not drift from lib/ weights — everything numeric is imported.
 */
import { hashIdentifier, normaliseEmail, normaliseAddress, normalisePhone } from '../../lib/identity/hash';
import { emailRoot } from '../../lib/identity/normalise';
import { SIGNAL_WEIGHTS, V2_IDENTIFIER_TYPE_WEIGHTS, scoreToGrade, type ConfidenceGrade } from '../../lib/engine/weights';

export { hashIdentifier, normaliseEmail, normaliseAddress, normalisePhone, scoreToGrade, emailRoot };

export const STRONG_TYPES = new Set([
  'email', 'email_root', 'phone', 'shipping_address', 'billing_address',
  'address_unit', 'payment_fingerprint', 'platform_customer_id', 'helpdesk_contact_id',
]);

// canonical v2 type weights — single source of truth in lib/engine/weights.ts
export const TYPE_WEIGHT: Record<string, number> = V2_IDENTIFIER_TYPE_WEIGHTS;

export const CROSS_MERCHANT_BONUS = SIGNAL_WEIGHTS.crossMerchant; // 24

export function scoreComponent(distinctTypes: Set<string>, merchantCount: number): {
  score: number; grade: ConfidenceGrade;
} {
  let base = 0;
  for (const t of distinctTypes) base += TYPE_WEIGHT[t] ?? 0;
  const score = Math.min(base + (merchantCount >= 2 ? CROSS_MERCHANT_BONUS : 0), 100);
  return { score, grade: scoreToGrade(score) };
}

// ── adapter signal emission (verbatim semantics from the Phase 4 Step 1+2 worker)
export type Sig = { type: string; hash: string };

export type TestOrder = {
  externalId: string;
  email?: string | null;
  phone?: string | null;
  ip?: string | null;
  paymentGateway?: string | null;
  cardLast4?: string | null;
  shippingAddress?: string | null;  // raw composed string, zip already zip5-truncated by caller
  billingAddress?: string | null;
  platformCustomerExternalId?: string | null;
};

export function signalsForOrder(o: TestOrder): Sig[] {
  const sigs: Sig[] = [];
  const ne = normaliseEmail(o.email ?? null);
  if (ne) sigs.push({ type: 'email', hash: hashIdentifier(ne) });
  const er = emailRoot(o.email ?? null);
  if (er) sigs.push({ type: 'email_root', hash: hashIdentifier(er) });
  const np = normalisePhone(o.phone ?? null);
  if (np) sigs.push({ type: 'phone', hash: hashIdentifier(np) });
  if (o.ip) sigs.push({ type: 'ip', hash: hashIdentifier(o.ip.trim()) });
  if (o.paymentGateway && o.cardLast4)
    sigs.push({ type: 'payment_fingerprint', hash: hashIdentifier(`${o.paymentGateway}:${o.cardLast4}`) });
  const ship = normaliseAddress(o.shippingAddress ?? null);
  if (ship) sigs.push({ type: 'shipping_address', hash: hashIdentifier(ship) });
  const bill = normaliseAddress(o.billingAddress ?? null);
  if (bill) sigs.push({ type: 'billing_address', hash: hashIdentifier(bill) });
  if (o.platformCustomerExternalId)
    sigs.push({ type: 'platform_customer_id', hash: `shopify:${o.platformCustomerExternalId}` });
  // de-dupe within entity
  const seen = new Set<string>();
  return sigs.filter((s) => s.hash && !seen.has(s.type + '|' + s.hash) && Boolean(seen.add(s.type + '|' + s.hash)));
}

export type EdgeRow = { left_type: string; left_hash: string; right_type: string; right_hash: string; count_delta: number };

/** pairwise edges across an entity's unique signals, canonical (lt,lh)<(rt,rh) ordering */
export function edgesForEntity(sigs: Sig[]): EdgeRow[] {
  const out: EdgeRow[] = [];
  for (let i = 0; i < sigs.length; i++) {
    for (let j = i + 1; j < sigs.length; j++) {
      let a = sigs[i], b = sigs[j];
      if (a.type > b.type || (a.type === b.type && a.hash > b.hash)) [a, b] = [b, a];
      out.push({ left_type: a.type, left_hash: a.hash, right_type: b.type, right_hash: b.hash, count_delta: 1 });
    }
  }
  return out;
}

// ── union-find (verbatim from the Phase 4 Step 3 worker)
export class UnionFind {
  parent = new Map<string, string>();
  add(k: string) { if (!this.parent.has(k)) this.parent.set(k, k); }
  find(x: string): string {
    let r = x;
    while (this.parent.get(r) !== r) r = this.parent.get(r)!;
    let c = x;
    while (this.parent.get(c) !== c) { const n = this.parent.get(c)!; this.parent.set(c, r); c = n; }
    return r;
  }
  union(a: string, b: string) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.parent.set(ra, rb); }
  components(): Map<string, string[]> {
    const comps = new Map<string, string[]>();
    for (const k of this.parent.keys()) {
      const r = this.find(k);
      if (!comps.has(r)) comps.set(r, []);
      comps.get(r)!.push(k);
    }
    return comps;
  }
}

export const nodeKey = (t: string, h: string) => t + '|' + h;

/** compose a US address string with zip5 truncation (schema: postal_code zip5) */
export function composeAddress(line1: string, line2: string | null, city: string, region: string, zip: string): {
  composed: string; zip5: string;
} {
  const zip5 = zip.split('-')[0];
  const composed = [line1, line2, city, region, zip5].filter(Boolean).join(', ');
  return { composed, zip5 };
}
