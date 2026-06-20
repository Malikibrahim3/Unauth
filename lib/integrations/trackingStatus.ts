import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

// Provider IDs that provide delivery-proof evidence (tracking + direct carrier proof).
// AfterShip is category 'tracking'; UPS/FedEx are category 'carrier'.
// All three count as a "tracking source" for the purposes of the nudge banner and
// per-case delivery-evidence gap.
export const TRACKING_PROVIDER_IDS = ['aftership', 'ups', 'fedex'] as const;

/**
 * Returns true if at least one tracking/carrier provider is connected for the
 * merchant. Checked from `merchant_integrations` — does not verify live API
 * reachability, only DB status (same as all other provider status reads).
 */
export async function getTrackingConnectionStatus(
  client: SupabaseClient,
  merchantId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from(TABLES.MERCHANT_INTEGRATIONS)
    .select('id')
    .eq('merchant_id', merchantId)
    .in('provider_id', TRACKING_PROVIDER_IDS)
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle();
  if (error) {
    // Fail open — if we can't check, don't show the banner unexpectedly
    return true;
  }
  return Boolean(data?.id);
}
