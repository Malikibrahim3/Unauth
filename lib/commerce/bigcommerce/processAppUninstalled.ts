import type { SupabaseClient } from '@supabase/supabase-js';

export async function processBigCommerceAppUninstalled(
  supabase: SupabaseClient,
  storeHash: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('commerce_store_connections' as never)
    .update({
      status: 'disabled',
      uninstalled_at: now,
      updated_at: now,
    } as never)
    .eq('platform', 'bigcommerce')
    .eq('store_key', storeHash);
}
