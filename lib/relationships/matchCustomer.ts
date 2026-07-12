/**
 * Deterministic customer matching. Resolves a subject to source_customers rows
 * by source customer id (strong) or normalized email (weak). Email alone yields
 * `probable` for a single hit and `ambiguous` for many — never a silent pick.
 *
 * This does not touch identity scoring / cluster building (§0 frozen rules); it
 * only produces reviewable product-graph candidates.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §8.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { deriveMatchResult, type MatchCandidate, type MatchMethod, type MatchResult } from '@/lib/relationships/matchTypes';

export type CustomerMatchSignals = {
  merchantId: string;
  /** Known source customer id (strong). */
  sourceCustomerId?: string | null;
  /** Customer email (weak). */
  email?: string | null;
  connectionId?: string | null;
};

async function customerIdsById(
  client: SupabaseClient,
  merchantId: string,
  id: string,
  connectionId?: string | null,
): Promise<string[]> {
  let query = client.from(TABLES.SOURCE_CUSTOMERS).select('id').eq('merchant_id', merchantId).eq('id', id);
  if (connectionId) query = query.eq('connection_id', connectionId);
  const { data, error } = await query.limit(50);
  if (error) throw new Error(`customer_match_lookup_failed(id): ${error.message}`);
  return [...new Set(((data as Array<{ id: string }> | null) ?? []).map((r) => r.id))];
}

async function customerIdsByEmail(
  client: SupabaseClient,
  merchantId: string,
  email: string,
  connectionId?: string | null,
): Promise<string[]> {
  let query = client.from(TABLES.SOURCE_CUSTOMERS).select('id').eq('merchant_id', merchantId).ilike('email', email);
  if (connectionId) query = query.eq('connection_id', connectionId);
  const { data, error } = await query.limit(50);
  if (error) throw new Error(`customer_match_lookup_failed(email): ${error.message}`);
  return [...new Set(((data as Array<{ id: string }> | null) ?? []).map((r) => r.id))];
}

export async function matchCustomer(
  client: SupabaseClient,
  signals: CustomerMatchSignals,
): Promise<MatchResult> {
  const { merchantId, connectionId } = signals;

  const tiers: Array<{ method: MatchMethod; ids: () => Promise<string[]> }> = [
    {
      method: 'customer_id',
      ids: async () => {
        const id = signals.sourceCustomerId?.trim();
        return id ? customerIdsById(client, merchantId, id, connectionId) : [];
      },
    },
    {
      method: 'email',
      ids: async () => {
        const email = signals.email?.trim().toLowerCase();
        return email ? customerIdsByEmail(client, merchantId, email, connectionId) : [];
      },
    },
  ];

  for (const tier of tiers) {
    const ids = await tier.ids();
    if (ids.length === 0) continue;
    const candidates: MatchCandidate[] = ids.map((id) => ({
      entityType: 'customer',
      entityId: id,
      method: tier.method,
    }));
    return deriveMatchResult(candidates);
  }
  return deriveMatchResult([]);
}
