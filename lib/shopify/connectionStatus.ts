import type { SupabaseClient } from '@supabase/supabase-js';

export type ShopifyConnectionStatus = {
  connected: boolean;
  shopDomain: string | null;
  lastError: string | null;
};

/** Canonical Shopify connection check — requires an active connection row. */
export async function getShopifyConnectionStatus(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<ShopifyConnectionStatus> {
  const { data } = await serviceClient
    .from('merchant_shopify_connections' as never)
    .select('shop_domain, active, last_error')
    .eq('merchant_id', merchantId)
    .eq('active', true)
    .maybeSingle();

  const row = data as { shop_domain?: string | null; last_error?: string | null } | null;

  if (!row?.shop_domain) {
    return { connected: false, shopDomain: null, lastError: null };
  }

  return {
    connected: true,
    shopDomain: row.shop_domain,
    lastError: row.last_error ?? null,
  };
}
