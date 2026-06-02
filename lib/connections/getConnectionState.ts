import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrderSourceConnectionStatus } from '@/lib/commerce/connectionStatus';
import type { OrderSourcePlatform } from '@/lib/commerce/types';
import { getShopifyConnectionStatus, type ShopifyLinkState } from '@/lib/shopify/connectionStatus';
import { TABLES } from '@/lib/supabase/tables';

export type HelpdeskProvider = 'gorgias' | 'zendesk' | 'freshdesk';

export type ConnectionState = {
  orderSourceConnected: boolean;
  orderSourcePlatform: OrderSourcePlatform | null;
  orderSourceStoreKey: string | null;
  /** True only when Shopify is the active order source. */
  shopify: boolean;
  helpdesk: boolean;
  helpdeskProvider: HelpdeskProvider | null;
  bothConnected: boolean;
  neitherConnected: boolean;
  shopifyOnlyConnected: boolean;
  helpdeskOnlyConnected: boolean;
  shopDomain: string | null;
  linkState: ShopifyLinkState;
};

export async function getConnectionState(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<ConnectionState> {
  const [orderSource, shopifyStatus, helpdeskRow] = await Promise.all([
    getOrderSourceConnectionStatus(serviceClient, merchantId),
    getShopifyConnectionStatus(serviceClient, merchantId),
    serviceClient
      .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
      .select('provider')
      .eq('merchant_id', merchantId)
      .eq('status', 'active')
      .in('provider', ['gorgias', 'zendesk', 'freshdesk'])
      .limit(1)
      .maybeSingle(),
  ]);

  const orderSourceConnected = orderSource.connected;
  const orderSourcePlatform = orderSource.platform;
  const orderSourceStoreKey = orderSource.storeKey;
  const shopify = orderSourcePlatform === 'shopify' && orderSourceConnected;

  const helpdeskProvider = (helpdeskRow.data?.provider as HelpdeskProvider | null) ?? null;
  const helpdesk = helpdeskProvider !== null;

  return {
    orderSourceConnected,
    orderSourcePlatform,
    orderSourceStoreKey,
    shopify,
    helpdesk,
    helpdeskProvider,
    bothConnected: orderSourceConnected && helpdesk,
    neitherConnected: !orderSourceConnected && !helpdesk,
    shopifyOnlyConnected: orderSourceConnected && !helpdesk,
    helpdeskOnlyConnected: !orderSourceConnected && helpdesk,
    shopDomain: shopify ? orderSourceStoreKey : shopifyStatus.shopDomain,
    linkState: shopifyStatus.linkState,
  };
}
