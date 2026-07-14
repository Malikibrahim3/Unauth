import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

// Direct carrier providers that provide tracking and delivery-proof evidence.
export const TRACKING_PROVIDER_IDS = ['ups', 'fedex'] as const;

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
