import type { SupabaseClient } from '@supabase/supabase-js';
import { loadBigCommerceAccessToken } from '@/lib/commerce/bigcommerce/bigcommerceApi';
import { deleteBigCommerceCollectorScript } from '@/lib/commerce/bigcommerce/collectorScript';

export async function processBigCommerceAppUninstalled(
  supabase: SupabaseClient,
  storeHash: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: connection } = await supabase
    .from('store_connections')
    .select('credentials_encrypted, collector_metadata')
    .eq('platform', 'bigcommerce')
    .eq('store_key', storeHash)
    .maybeSingle();

  const metadata = (connection?.collector_metadata ?? {}) as Record<string, unknown>;
  const scriptUuid = typeof metadata.bigcommerce_script_uuid === 'string'
    ? metadata.bigcommerce_script_uuid
    : null;

  if (scriptUuid && connection?.credentials_encrypted) {
    try {
      const accessToken = await loadBigCommerceAccessToken(connection.credentials_encrypted);
      await deleteBigCommerceCollectorScript({ storeHash, accessToken, scriptUuid });
    } catch (error) {
      console.error('BigCommerce collector script cleanup failed', {
        storeHash,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  const { error } = await supabase
    .from('store_connections')
    .update({
      status: 'revoked',
      uninstalled_at: now,
      updated_at: now,
    })
    .eq('platform', 'bigcommerce')
    .eq('store_key', storeHash);
  if (error) throw new Error(`store_connection_uninstall_failed: ${error.message}`);
}
