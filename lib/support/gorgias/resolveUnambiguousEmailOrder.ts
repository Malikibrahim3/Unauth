import type { SupabaseClient } from '@supabase/supabase-js';
import { matchOrder } from '@/lib/relationships/matchOrder';

export type GateOrderReference = {
  id: string;
  external_id: string;
  order_number: string | null;
  placed_at: string | null;
  ingested_at: string | null;
};

export async function resolveUnambiguousEmailOrder(
  client: SupabaseClient,
  merchantId: string,
  email: string,
): Promise<GateOrderReference | null> {
  const result = await matchOrder(client, { merchantId, email });
  if (result.status === 'ambiguous' || result.candidates.length !== 1) return null;
  const orderId = result.candidates[0].entityId;

  const { data, error } = await client
    .from('source_orders')
    .select('id,external_id,order_number,placed_at,ingested_at')
    .eq('merchant_id', merchantId)
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new Error(`gorgias_email_order_lookup_failed: ${error.message}`);
  return (data as GateOrderReference | null) ?? null;
}
