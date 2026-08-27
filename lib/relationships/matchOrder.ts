/**
 * Deterministic order matching. Given the identifiers a subject (ticket, case,
 * refund, …) carries, find the source order(s) it refers to and derive a match
 * result. Identifiers are tried strongest → weakest and only the strongest tier
 * that produces any candidate is used, so a weak email match never competes
 * with a strong order-number match.
 *
 * Email alone must never silently select the newest of several orders — it
 * yields `probable` for a single hit and `ambiguous` for many.
 *
 * See ARCHITECTURE.md for the canonical relationship and product-truth owners.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { deriveMatchResult, type MatchCandidate, type MatchMethod, type MatchResult } from '@/lib/relationships/matchTypes';

export type OrderMatchSignals = {
  merchantId: string;
  /** Connector-declared source order id (already resolved). Strongest. */
  declaredSourceOrderId?: string | null;
  /** External transaction ids (payment/refund/fulfilment). */
  transactionIds?: string[];
  /** External order references (external_id). */
  externalOrderIds?: string[];
  /** Normalized order numbers (# stripped). */
  orderNumbers?: string[];
  /** Tracking numbers (resolved to orders via fulfilments/shipments). */
  trackingNumbers?: string[];
  /** Source customer id. */
  sourceCustomerId?: string | null;
  /** Customer email (weak). */
  email?: string | null;
  /** Restrict order lookups to a connection when known, to avoid cross-account bleed. */
  connectionId?: string | null;
};

function clean(values: readonly (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const v of values) {
    const t = v?.replace(/^#/, '').trim();
    if (t) out.add(t);
  }
  return [...out];
}

function uniqIds(rows: Array<{ id?: string | null; source_order_id?: string | null }> | null, key: 'id' | 'source_order_id'): string[] {
  const out = new Set<string>();
  for (const r of rows ?? []) {
    const v = r[key];
    if (v) out.add(v);
  }
  return [...out];
}

async function findOrderIds(
  client: SupabaseClient,
  merchantId: string,
  column: string,
  values: string[],
  connectionId?: string | null,
): Promise<string[]> {
  if (values.length === 0) return [];
  let query = client
    .from(TABLES.SOURCE_ORDERS)
    .select('id')
    .eq('merchant_id', merchantId)
    .in(column, values);
  if (connectionId) query = query.eq('connection_id', connectionId);
  const { data, error } = await query.limit(50);
  if (error) throw new Error(`order_match_lookup_failed(${column}): ${error.message}`);
  return uniqIds(data as Array<{ id: string }> | null, 'id');
}

async function findOrderIdsByTracking(
  client: SupabaseClient,
  merchantId: string,
  trackingNumbers: string[],
): Promise<string[]> {
  const values = clean(trackingNumbers);
  if (values.length === 0) return [];
  const out = new Set<string>();
  for (const table of [TABLES.SOURCE_FULFILLMENTS, TABLES.SOURCE_SHIPMENTS]) {
    const { data, error } = await client
      .from(table)
      .select('source_order_id')
      .eq('merchant_id', merchantId)
      .in('tracking_number', values)
      .limit(50);
    if (error) throw new Error(`order_match_lookup_failed(tracking): ${error.message}`);
    for (const id of uniqIds(data as Array<{ source_order_id: string | null }> | null, 'source_order_id')) {
      out.add(id);
    }
  }
  return [...out];
}

async function findOrderIdsByEmail(
  client: SupabaseClient,
  merchantId: string,
  email: string,
  connectionId?: string | null,
): Promise<string[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  let query = client
    .from(TABLES.SOURCE_ORDERS)
    .select('id')
    .eq('merchant_id', merchantId)
    .ilike('email', normalized);
  if (connectionId) query = query.eq('connection_id', connectionId);
  const { data, error } = await query.limit(50);
  if (error) throw new Error(`order_match_lookup_failed(email): ${error.message}`);
  return uniqIds(data as Array<{ id: string }> | null, 'id');
}

/**
 * Resolve order candidates for the given signals and derive a match result.
 * Walks the deterministic priority ladder and stops at the first tier that
 * yields any candidate.
 */
export async function matchOrder(
  client: SupabaseClient,
  signals: OrderMatchSignals,
): Promise<MatchResult> {
  const { merchantId, connectionId } = signals;

  const tiers: Array<{ method: MatchMethod; ids: () => Promise<string[]> }> = [
    {
      method: 'connector_declared',
      ids: async () => (signals.declaredSourceOrderId ? [signals.declaredSourceOrderId] : []),
    },
    {
      method: 'transaction_id',
      ids: () => findOrderIds(client, merchantId, 'external_id', clean(signals.transactionIds ?? []), connectionId),
    },
    {
      method: 'external_reference',
      ids: () => findOrderIds(client, merchantId, 'external_id', clean(signals.externalOrderIds ?? []), connectionId),
    },
    {
      method: 'order_number',
      ids: () => findOrderIds(client, merchantId, 'order_number', clean(signals.orderNumbers ?? []), connectionId),
    },
    {
      method: 'tracking_number',
      ids: () => findOrderIdsByTracking(client, merchantId, signals.trackingNumbers ?? []),
    },
    {
      method: 'customer_id',
      ids: async () =>
        signals.sourceCustomerId
          ? findOrderIds(client, merchantId, 'source_customer_id', [signals.sourceCustomerId], connectionId)
          : [],
    },
    {
      method: 'email',
      ids: async () =>
        signals.email ? findOrderIdsByEmail(client, merchantId, signals.email, connectionId) : [],
    },
  ];

  for (const tier of tiers) {
    const ids = await tier.ids();
    if (ids.length === 0) continue;
    const candidates: MatchCandidate[] = ids.map((id) => ({
      entityType: 'order',
      entityId: id,
      method: tier.method,
    }));
    return deriveMatchResult(candidates);
  }

  return deriveMatchResult([]);
}
