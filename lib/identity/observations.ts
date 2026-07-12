/**
 * Canonical v2 identity-signal emission — the ONLY adapter between layer-1
 * source entities and the network signal layer (identity_signals /
 * identity_edges via the ingest_identity_observations RPC).
 *
 * Every ingestion path (Shopify/Woo/BigCommerce webhooks, helpdesk intake,
 * CSV pipeline, backfills) must emit through this module so normalisation,
 * hashing, derived types (email_root) and edge canonicalisation stay single-
 * sourced. Supersedes the retired bulk_upsert_* RPC writers and the one-off
 * Phase 4 migration worker.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail, normalisePhone, emailRoot } from '@/lib/identity/normalise';

export const STRONG_IDENTIFIER_TYPES = new Set([
  'email', 'email_root', 'phone', 'shipping_address', 'billing_address',
  'address_unit', 'payment_fingerprint', 'platform_customer_id', 'helpdesk_contact_id',
]);

export type IdentitySignal = { type: string; hash: string };

export type ObservationEntity = {
  /** provenance: exactly one layer-1 row */
  provenance: { orderId?: string; customerId?: string; ticketId?: string };
  source: 'shopify' | 'woocommerce' | 'bigcommerce' | 'gorgias' | 'zendesk' | 'freshdesk' | 'csv' | 'manual';
  /**
   * Account/connection scope for provider-issued external IDs. When two accounts
   * of the same provider (e.g. two Shopify stores) reuse a customer/contact
   * external ID, the platform_customer_id / helpdesk_contact_id namespace must
   * distinguish them. Left undefined for single-account merchants keeps the
   * historical `${source}:${id}` key byte-for-byte identical (no re-hash, no
   * broken links). Phase 2's connection backfill supplies this and re-emits.
   * This is an identity-KEY scoping seam only — no weight/threshold/cluster change.
   */
  sourceAccountKey?: string | null;
  observedAt?: string | null;
  email?: string | null;
  otherEmails?: Array<string | null> | null;
  phone?: string | null;
  ip?: string | null;
  paymentGateway?: string | null;
  cardLast4?: string | null;
  /** normaliseAddress() output (normalized_full), not a raw address string */
  shippingNormalized?: string | null;
  billingNormalized?: string | null;
  platformCustomerExternalId?: string | null;
  helpdeskContactExternalId?: string | null;
};

export function signalsForEntity(e: ObservationEntity): IdentitySignal[] {
  const sigs: IdentitySignal[] = [];
  const emails = [e.email, ...(e.otherEmails ?? [])];
  for (const raw of emails) {
    const ne = normaliseEmail(raw ?? null);
    if (ne) sigs.push({ type: 'email', hash: hashIdentifier(ne) });
    const er = emailRoot(raw ?? null);
    if (er) sigs.push({ type: 'email_root', hash: hashIdentifier(er) });
  }
  const np = normalisePhone(e.phone ?? null);
  if (np) sigs.push({ type: 'phone', hash: hashIdentifier(np) });
  if (e.ip?.trim() && e.ip.trim().toLowerCase() !== 'unknown') {
    sigs.push({ type: 'ip', hash: hashIdentifier(e.ip.trim()) });
  }
  if (e.paymentGateway && e.cardLast4) {
    sigs.push({ type: 'payment_fingerprint', hash: hashIdentifier(`${e.paymentGateway}:${e.cardLast4}`) });
  }
  if (e.shippingNormalized) sigs.push({ type: 'shipping_address', hash: hashIdentifier(e.shippingNormalized) });
  if (e.billingNormalized) sigs.push({ type: 'billing_address', hash: hashIdentifier(e.billingNormalized) });
  // Account-scoped namespace: `source[:accountKey]:externalId`. When
  // sourceAccountKey is absent the key is exactly `${source}:${id}` — identical
  // to the pre-MVP+ value, so existing single-account identity links are
  // preserved with no re-hash.
  const scope = e.sourceAccountKey ? `${e.source}:${e.sourceAccountKey}` : e.source;
  if (e.platformCustomerExternalId) {
    sigs.push({ type: 'platform_customer_id', hash: `${scope}:${e.platformCustomerExternalId}` });
  }
  if (e.helpdeskContactExternalId) {
    sigs.push({ type: 'helpdesk_contact_id', hash: `${scope}:${e.helpdeskContactExternalId}` });
  }
  const seen = new Set<string>();
  return sigs.filter((s) => s.hash && !seen.has(`${s.type}|${s.hash}`) && Boolean(seen.add(`${s.type}|${s.hash}`)));
}

type EdgeRow = { left_type: string; left_hash: string; right_type: string; right_hash: string; count_delta: number };

/** pairwise co-occurrence edges, canonical (type, hash) tuple ordering */
export function edgesForSignals(sigs: IdentitySignal[]): EdgeRow[] {
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

export type EmitResult = { signals: number; edges: number; signalKeys: IdentitySignal[] };

/**
 * Emits signals + edges for a batch of entities belonging to one merchant via
 * the canonical RPC. Returns the distinct signal keys so callers can hand
 * them to the resolver as seeds.
 */
export async function emitIdentityObservations(
  client: SupabaseClient<any>,
  merchantId: string,
  entities: ObservationEntity[]
): Promise<EmitResult> {
  const signalRows: Record<string, unknown>[] = [];
  const edgeMap = new Map<string, EdgeRow>();
  const keySet = new Map<string, IdentitySignal>();

  for (const e of entities) {
    const provCount = [e.provenance.orderId, e.provenance.customerId, e.provenance.ticketId]
      .filter(Boolean).length;
    if (provCount !== 1) {
      throw new Error(`observation entity must have exactly one provenance id (got ${provCount})`);
    }
    const sigs = signalsForEntity(e);
    for (const s of sigs) {
      signalRows.push({
        identifier_type: s.type,
        identifier_hash: s.hash,
        source: e.source,
        source_order_id: e.provenance.orderId ?? null,
        source_customer_id: e.provenance.customerId ?? null,
        source_ticket_id: e.provenance.ticketId ?? null,
        observed_at: e.observedAt ?? null,
      });
      keySet.set(`${s.type}|${s.hash}`, s);
    }
    for (const edge of edgesForSignals(sigs)) {
      const k = `${edge.left_type}|${edge.left_hash}|${edge.right_type}|${edge.right_hash}`;
      const prev = edgeMap.get(k);
      if (prev) prev.count_delta += edge.count_delta;
      else edgeMap.set(k, { ...edge });
    }
  }

  if (signalRows.length === 0) return { signals: 0, edges: 0, signalKeys: [] };

  const { error } = await client.rpc('ingest_identity_observations', {
    p_merchant_id: merchantId,
    p_signals: signalRows,
    p_edges: [...edgeMap.values()],
  });
  if (error) throw new Error(`ingest_identity_observations failed: ${error.message}`);

  return { signals: signalRows.length, edges: edgeMap.size, signalKeys: [...keySet.values()] };
}
