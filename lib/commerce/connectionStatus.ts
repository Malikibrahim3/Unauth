import type { SupabaseClient } from '@supabase/supabase-js';
import { getShopifyConnectionStatus, type ShopifyLinkState } from '@/lib/shopify/connectionStatus';
import type { CommercePlatform, OrderSourcePlatform } from '@/lib/commerce/types';

export type OrderSourceConnectionStatus = {
  connected: boolean;
  platform: OrderSourcePlatform | null;
  storeKey: string | null;
  linkState: ShopifyLinkState;
  lastError: string | null;
};

/** Any live order source (Shopify OAuth, WooCommerce REST, or BigCommerce OAuth). */
export async function getOrderSourceConnectionStatus(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<OrderSourceConnectionStatus> {
  const shopifyStatus = await getShopifyConnectionStatus(serviceClient, merchantId);
  if (shopifyStatus.connected && shopifyStatus.shopDomain) {
    return {
      connected: true,
      platform: 'shopify',
      storeKey: shopifyStatus.shopDomain,
      linkState: shopifyStatus.linkState,
      lastError: shopifyStatus.lastError,
    };
  }

  const wooStatus = await getCommercePlatformConnectionStatus(
    serviceClient,
    merchantId,
    'woocommerce',
  );
  if (wooStatus.connected) {
    return {
      connected: true,
      platform: 'woocommerce',
      storeKey: wooStatus.storeKey,
      linkState: shopifyStatus.linkState,
      lastError: wooStatus.lastError,
    };
  }

  const bcStatus = await getCommercePlatformConnectionStatus(
    serviceClient,
    merchantId,
    'bigcommerce',
  );
  if (bcStatus.connected) {
    return {
      connected: true,
      platform: 'bigcommerce',
      storeKey: bcStatus.storeKey,
      linkState: shopifyStatus.linkState,
      lastError: bcStatus.lastError,
    };
  }

  return {
    connected: false,
    platform: null,
    storeKey: shopifyStatus.shopDomain ?? wooStatus.storeKey ?? bcStatus.storeKey,
    linkState: shopifyStatus.linkState,
    lastError: bcStatus.lastError ?? wooStatus.lastError ?? shopifyStatus.lastError,
  };
}

export async function getCommercePlatformConnectionStatus(
  serviceClient: SupabaseClient,
  merchantId: string,
  platform: CommercePlatform,
): Promise<{ connected: boolean; storeKey: string | null; lastError: string | null }> {
  const { data, error } = await serviceClient
    .from('store_connections')
    .select('store_key, status, last_error, uninstalled_at')
    .eq('merchant_id', merchantId)
    .eq('platform', platform)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getCommercePlatformConnectionStatus failed', { merchantId, platform, message: error.message });
    return { connected: false, storeKey: null, lastError: null };
  }

  const row = data as {
    store_key?: string;
    status?: string;
    last_error?: string | null;
    uninstalled_at?: string | null;
  } | null;

  if (!row || row.status !== 'active' || row.uninstalled_at) {
    return {
      connected: false,
      storeKey: row?.store_key ?? null,
      lastError: row?.last_error ?? null,
    };
  }

  return {
    connected: true,
    storeKey: row.store_key ?? null,
    lastError: row.last_error ?? null,
  };
}
