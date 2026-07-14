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
    .select('id, merchant_id, credentials_encrypted, collector_metadata')
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
        category: error instanceof Error ? error.message.split(':', 1)[0] : 'unknown',
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
    .eq('id', connection?.id ?? '')
    .eq('merchant_id', connection?.merchant_id ?? '');
  if (error) throw new Error(`store_connection_uninstall_failed: ${error.message}`);
  if (connection) {
    const { error: canonicalError } = await supabase.from('merchant_integrations').update({
      status: 'revoked',
      disconnected_at: now,
      webhook_status: 'missing',
      updated_at: now,
    }).eq('merchant_id', connection.merchant_id)
      .eq('provider_id', 'bigcommerce')
      .eq('provider_account_id', storeHash);
    if (canonicalError) throw new Error(`canonical_connection_uninstall_failed:${canonicalError.message}`);
  }
}
