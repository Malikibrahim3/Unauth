import type { SupabaseClient } from '@supabase/supabase-js';

export type ShopifyLinkState =
  | 'connected'
  | 'not_connected'
  | 'disconnected'
  | 'installed_unlinked';

export type ShopifyConnectionStatus = {
  connected: boolean;
  linkState: ShopifyLinkState;
  shopDomain: string | null;
  lastError: string | null;
};

type ConnectionRow = {
  store_key: string | null;
  status: string | null;
  uninstalled_at: string | null;
  credentials_encrypted: string | null;
  last_error: string | null;
};

/**
 * Canonical Shopify connection check for the current merchant workspace.
 *
 * v2: a single `store_connections` row (platform='shopify', store_key=shop_domain)
 * holds status, uninstall state and the encrypted credentials. There is no longer a
 * separate token table, so "has a live token" == status='active' && uninstalled_at is null.
 */
export async function getShopifyConnectionStatus(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<ShopifyConnectionStatus> {
  const { data, error } = await serviceClient
    .from('store_connections')
    .select('store_key, status, uninstalled_at, credentials_encrypted, last_error')
    .eq('merchant_id', merchantId)
    .eq('platform', 'shopify')
    .order('installed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getShopifyConnectionStatus query failed', { merchantId, message: error.message });
    return { connected: false, linkState: 'not_connected', shopDomain: null, lastError: null };
  }

  const row = data as ConnectionRow | null;
  const shopDomain = row?.store_key ?? null;
  const hasLiveCredentials = Boolean(row?.credentials_encrypted) && !row?.uninstalled_at;

  if (row?.status === 'active' && shopDomain && hasLiveCredentials) {
    return {
      connected: true,
      linkState: 'connected',
      shopDomain,
      lastError: row?.last_error ?? null,
    };
  }

  if (shopDomain && row?.uninstalled_at) {
    return {
      connected: false,
      linkState: 'disconnected',
      shopDomain,
      lastError: row?.last_error ?? null,
    };
  }

  if (shopDomain && row?.status !== 'active' && hasLiveCredentials) {
    return {
      connected: false,
      linkState: 'installed_unlinked',
      shopDomain,
      lastError: row?.last_error ?? null,
    };
  }

  return { connected: false, linkState: 'not_connected', shopDomain: null, lastError: null };
}
