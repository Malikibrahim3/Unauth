import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommerceConnectionStatus, CommercePlatform } from '@/lib/commerce/types';

export type CommerceStoreConnectionRow = {
  id: string;
  merchant_id: string;
  platform: CommercePlatform;
  store_key: string;
  store_url: string;
  status: CommerceConnectionStatus;
  credentials_encrypted: string;
  uninstalled_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function upsertCommerceStoreConnection(
  supabase: SupabaseClient,
  input: {
    merchant_id: string;
    platform: CommercePlatform;
    store_key: string;
    store_url: string;
    status: CommerceConnectionStatus;
    credentials_encrypted: string;
    last_error?: string | null;
    last_sync_at?: string | null;
    uninstalled_at?: string | null;
  },
): Promise<CommerceStoreConnectionRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('commerce_store_connections' as never)
    .upsert(
      {
        merchant_id: input.merchant_id,
        platform: input.platform,
        store_key: input.store_key,
        store_url: input.store_url,
        status: input.status,
        credentials_encrypted: input.credentials_encrypted,
        last_error: input.last_error ?? null,
        last_sync_at: input.last_sync_at ?? null,
        uninstalled_at: input.uninstalled_at ?? null,
        updated_at: now,
      } as never,
      { onConflict: 'merchant_id,platform,store_key' },
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`upsert_commerce_store_connection_failed: ${error?.message ?? 'unknown'}`);
  }

  return data as CommerceStoreConnectionRow;
}

export async function getActiveCommerceStoreConnection(
  supabase: SupabaseClient,
  merchantId: string,
  platform: CommercePlatform,
): Promise<CommerceStoreConnectionRow | null> {
  const { data, error } = await supabase
    .from('commerce_store_connections' as never)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('platform', platform)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`get_commerce_store_connection_failed: ${error.message}`);
  }

  return (data as CommerceStoreConnectionRow | null) ?? null;
}
