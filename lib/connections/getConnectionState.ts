import type { SupabaseClient } from '@supabase/supabase-js';
import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';
import { TABLES } from '@/lib/supabase/tables';

export type HelpdeskProvider = 'gorgias' | 'zendesk';

export type ConnectionState = {
  shopify: boolean;
  helpdesk: boolean;
  helpdeskProvider: HelpdeskProvider | null;
  bothConnected: boolean;
  neitherConnected: boolean;
  shopifyOnlyConnected: boolean;
  helpdeskOnlyConnected: boolean;
};

export async function getConnectionState(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<ConnectionState> {
  const [shopifyStatus, helpdeskRow] = await Promise.all([
    getShopifyConnectionStatus(serviceClient, merchantId),
    serviceClient
      .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
      .select('provider')
      .eq('merchant_id', merchantId)
      .eq('status', 'active')
      .in('provider', ['gorgias', 'zendesk'])
      .limit(1)
      .maybeSingle(),
  ]);

  const shopify = shopifyStatus.connected;
  const helpdeskProvider = (helpdeskRow.data?.provider as HelpdeskProvider | null) ?? null;
  const helpdesk = helpdeskProvider !== null;

  return {
    shopify,
    helpdesk,
    helpdeskProvider,
    bothConnected: shopify && helpdesk,
    neitherConnected: !shopify && !helpdesk,
    shopifyOnlyConnected: shopify && !helpdesk,
    helpdeskOnlyConnected: !shopify && helpdesk,
  };
}
