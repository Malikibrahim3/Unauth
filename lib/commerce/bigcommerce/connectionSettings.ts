import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import {
  getActiveCommerceStoreConnection,
  type CommerceStoreConnectionRow,
} from '@/lib/commerce/connectionStore';
import {
  buildBigCommerceWebhookDeliveryUrl,
  type BigCommerceConnectionSettings,
} from '@/lib/commerce/bigcommerce/bigcommerceConnectionShared';

function toBigCommerceConnectionSettings(
  row: CommerceStoreConnectionRow,
): BigCommerceConnectionSettings {
  return {
    id: row.id,
    store_key: row.store_key,
    store_url: row.store_url,
    status: row.status,
    last_sync_at: row.last_sync_at,
    last_error: row.last_error,
    credentials_configured: Boolean(row.credentials_encrypted?.trim()),
    webhook_url: buildBigCommerceWebhookDeliveryUrl(),
  };
}

export async function getMerchantBigCommerceConnection(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<BigCommerceConnectionSettings | null> {
  const row = await getActiveCommerceStoreConnection(supabase, merchantId, 'bigcommerce');
  if (!row) {
    const { data } = await supabase
      .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('platform', 'bigcommerce')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return toBigCommerceConnectionSettings(data as CommerceStoreConnectionRow);
  }
  return toBigCommerceConnectionSettings(row);
}

export async function disableMerchantBigCommerceConnection(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<BigCommerceConnectionSettings> {
  const existing = await getMerchantBigCommerceConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('bigcommerce_connection_not_found');
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
    .update({
      status: 'disabled',
      uninstalled_at: now,
      last_error: null,
      updated_at: now,
    } as never)
    .eq('id', existing.id)
    .eq('merchant_id', merchantId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`disable_bigcommerce_connection_failed: ${error?.message ?? 'unknown'}`);
  }

  return toBigCommerceConnectionSettings(data as CommerceStoreConnectionRow);
}

export async function loadBigCommerceCredentialsForStore(
  supabase: SupabaseClient,
  storeHash: string,
): Promise<{ store_url: string; credentials_encrypted: string } | null> {
  const { data, error } = await supabase
    .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
    .select('store_url, credentials_encrypted')
    .eq('platform', 'bigcommerce')
    .eq('store_key', storeHash)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(`load_bigcommerce_credentials_failed: ${error.message}`);
  }

  const row = data as { store_url?: string; credentials_encrypted?: string } | null;
  if (!row?.store_url || !row.credentials_encrypted?.trim()) return null;
  return { store_url: row.store_url, credentials_encrypted: row.credentials_encrypted };
}
