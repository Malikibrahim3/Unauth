/**
 * Deterministic shipment matching. Resolves a subject (tracking event, ticket,
 * carrier record) to source_shipments rows by tracking number. Tracking numbers
 * are strong identifiers, so a single hit confirms.
 *
 * See ARCHITECTURE.md for the canonical relationship and product-truth owners.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { deriveMatchResult, type MatchCandidate, type MatchResult } from '@/lib/relationships/matchTypes';

export type ShipmentMatchSignals = {
  merchantId: string;
  trackingNumbers?: string[];
  sourceAccountId?: string | null;
};

function clean(values: readonly (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (t) out.add(t);
  }
  return [...out];
}

export async function matchShipment(
  client: SupabaseClient,
  signals: ShipmentMatchSignals,
): Promise<MatchResult> {
  const values = clean(signals.trackingNumbers ?? []);
  if (values.length === 0) return deriveMatchResult([]);

  let query = client
    .from(TABLES.SOURCE_SHIPMENTS)
    .select('id')
    .eq('merchant_id', signals.merchantId)
    .in('tracking_number', values);
  if (signals.sourceAccountId) query = query.eq('source_account_id', signals.sourceAccountId);
  const { data, error } = await query.limit(50);
  if (error) throw new Error(`shipment_match_lookup_failed: ${error.message}`);

  const ids = [...new Set(((data as Array<{ id: string }> | null) ?? []).map((r) => r.id))];
  const candidates: MatchCandidate[] = ids.map((id) => ({
    entityType: 'shipment',
    entityId: id,
    method: 'tracking_number',
  }));
  return deriveMatchResult(candidates);
}
