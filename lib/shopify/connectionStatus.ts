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
  shop_domain?: string | null;
  active?: boolean | null;
  uninstalled_at?: string | null;
};

type ShopMerchantRow = {
  access_token?: string | null;
  uninstalled_at?: string | null;
};

async function shopHasLiveToken(
  serviceClient: SupabaseClient,
  shopDomain: string,
): Promise<boolean> {
  const { data } = await serviceClient
    .from('shopify_merchants' as never)
    .select('access_token, uninstalled_at')
    .eq('shop_domain', shopDomain)
    .maybeSingle();

  const row = data as ShopMerchantRow | null;
  return Boolean(row?.access_token) && !row?.uninstalled_at;
}

/** Canonical Shopify connection check for the current merchant workspace. */
export async function getShopifyConnectionStatus(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<ShopifyConnectionStatus> {
  const { data, error } = await serviceClient
    .from('merchant_shopify_connections' as never)
    .select('shop_domain, active, uninstalled_at')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (error) {
    console.error('getShopifyConnectionStatus query failed', { merchantId, message: error.message });
    return { connected: false, linkState: 'not_connected', shopDomain: null, lastError: null };
  }

  const row = data as ConnectionRow | null;
  const shopDomain = row?.shop_domain ?? null;

  if (row?.active && shopDomain && (await shopHasLiveToken(serviceClient, shopDomain))) {
    return {
      connected: true,
      linkState: 'connected',
      shopDomain,
      lastError: null,
    };
  }

  if (shopDomain && row?.uninstalled_at) {
    return {
      connected: false,
      linkState: 'disconnected',
      shopDomain,
      lastError: null,
    };
  }

  if (shopDomain && !row?.active && (await shopHasLiveToken(serviceClient, shopDomain))) {
    return {
      connected: false,
      linkState: 'installed_unlinked',
      shopDomain,
      lastError: null,
    };
  }

  return { connected: false, linkState: 'not_connected', shopDomain: null, lastError: null };
}
