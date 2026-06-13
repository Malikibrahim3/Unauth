import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommercePlatform } from '@/lib/commerce/types';

export async function resolveMerchantIdForCommerceStore(
  supabase: SupabaseClient,
  platform: CommercePlatform,
  storeKey: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('store_connections')
    .select('merchant_id')
    .eq('platform', platform)
    .eq('store_key', storeKey)
    .eq('status', 'active')
    .is('uninstalled_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`resolve_merchant_for_commerce_store_failed: ${error.message}`);
  }

  return (data as { merchant_id?: string } | null)?.merchant_id ?? null;
}
