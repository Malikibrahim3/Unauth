import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { TABLES } from '@/lib/supabase/tables';
import type { CommerceConnectionStatus, CommercePlatform } from '@/lib/commerce/types';

const STORE_CONNECTIONS_TABLE = TABLES.MERCHANT_SHOPIFY_CONNECTIONS;

type StoreConnectionsRow = Database['public']['Tables']['store_connections']['Row'];
type StoreConnectionUpdate = Database['public']['Tables']['store_connections']['Update'];

/**
 * Commerce-cluster view of a {@link StoreConnectionsRow}. Narrows the platform
 * to the WooCommerce/BigCommerce subset this cluster manages and treats the
 * always-populated columns (store_url, credentials_encrypted) as non-null for
 * the rows this code writes.
 */
export type CommerceStoreConnectionRow = Omit<
  StoreConnectionsRow,
  'platform' | 'status' | 'store_url' | 'scopes'
> & {
  platform: CommercePlatform;
  status: CommerceConnectionStatus;
  store_url: string;
  scopes: StoreConnectionsRow['scopes'];
};

function toCommerceStoreConnectionRow(row: StoreConnectionsRow): CommerceStoreConnectionRow {
  return {
    ...row,
    platform: row.platform as CommercePlatform,
    status: row.status as CommerceConnectionStatus,
    store_url: row.store_url ?? '',
  };
}

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
    scopes?: string[] | null;
  },
): Promise<CommerceStoreConnectionRow> {
  const now = new Date().toISOString();
  const upsertRow: StoreConnectionUpdate = {
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
  };
  if (input.scopes !== undefined) {
    upsertRow.scopes = input.scopes ?? [];
  }
  const { data, error } = await supabase
    .from(STORE_CONNECTIONS_TABLE)
    .upsert(upsertRow, { onConflict: 'platform,store_key' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`upsert_commerce_store_connection_failed: ${error?.message ?? 'unknown'}`);
  }

  return toCommerceStoreConnectionRow(data as StoreConnectionsRow);
}

export async function getActiveCommerceStoreConnection(
  supabase: SupabaseClient,
  merchantId: string,
  platform: CommercePlatform,
): Promise<CommerceStoreConnectionRow | null> {
  const { data, error } = await supabase
    .from(STORE_CONNECTIONS_TABLE)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('platform', platform)
    .eq('status', 'active')
    .is('uninstalled_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`get_commerce_store_connection_failed: ${error.message}`);
  }

  return data ? toCommerceStoreConnectionRow(data as StoreConnectionsRow) : null;
}
