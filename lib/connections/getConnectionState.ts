import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrderSourceConnectionStatus } from '@/lib/commerce/connectionStatus';
import type { OrderSourcePlatform } from '@/lib/commerce/types';
import { resolveMerchantHelpdeskLink } from '@/lib/support/helpdesk/resolveMerchantHelpdeskLink';
import { getShopifyConnectionStatus, type ShopifyLinkState } from '@/lib/shopify/connectionStatus';
import { getTrackingConnectionStatus } from '@/lib/integrations/trackingStatus';

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
  orderSourceOnlyConnected: boolean;
  helpdeskOnlyConnected: boolean;
  shopDomain: string | null;
  linkState: ShopifyLinkState;
  /** True when at least one direct carrier provider (UPS or FedEx) is connected. */
  trackingConnected: boolean;
};

export async function getConnectionState(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<ConnectionState> {
  const [orderSource, shopifyStatus, helpdeskLink, trackingConnected] = await Promise.all([
    getOrderSourceConnectionStatus(serviceClient, merchantId),
    getShopifyConnectionStatus(serviceClient, merchantId),
    resolveMerchantHelpdeskLink(serviceClient, merchantId),
    getTrackingConnectionStatus(serviceClient, merchantId),
  ]);

  const orderSourceConnected = orderSource.connected;
  const orderSourcePlatform = orderSource.platform;
  const orderSourceStoreKey = orderSource.storeKey;
  const shopify = orderSourcePlatform === 'shopify' && orderSourceConnected;

  const helpdeskProvider = helpdeskLink.provider;
  const helpdesk = helpdeskLink.linked;

  return {
    orderSourceConnected,
    orderSourcePlatform,
    orderSourceStoreKey,
    shopify,
    helpdesk,
    helpdeskProvider,
    bothConnected: orderSourceConnected && helpdesk,
    neitherConnected: !orderSourceConnected && !helpdesk,
    orderSourceOnlyConnected: orderSourceConnected && !helpdesk,
    helpdeskOnlyConnected: !orderSourceConnected && helpdesk,
    shopDomain: shopify ? orderSourceStoreKey : shopifyStatus.shopDomain,
    linkState: shopifyStatus.linkState,
    trackingConnected,
  };
}
