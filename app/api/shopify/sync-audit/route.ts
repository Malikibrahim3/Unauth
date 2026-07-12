import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { backfillShopifyMerchantIdentities } from '@/lib/shopify/backfill';
import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';
import { shopifyDebugLog } from '@/lib/shopify/debugLog';

/** Allow large Shopify backfills on Vercel (same as CSV processing routes). */
export const maxDuration = 300;

/**
 * Pull Shopify historical orders into the v2 source tables (manual / reconnect follow-up).
 */
export async function POST() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const connection = await getShopifyConnectionStatus(serviceClient, ctx.merchantId);
  if (!connection.connected || !connection.shopDomain) {
    return NextResponse.json({ error: 'Shopify is not connected' }, { status: 400 });
  }

  const shopDomain = connection.shopDomain;

  const { data: storeConnection, error: connectionError } = await serviceClient
    .from('store_connections')
    .select('credentials_encrypted')
    .eq('merchant_id', ctx.merchantId)
    .eq('platform', 'shopify')
    .eq('store_key', shopDomain)
    .maybeSingle();

  if (connectionError) {
    return NextResponse.json({ error: `Shopify connection lookup failed: ${connectionError.message}` }, { status: 500 });
  }
  if (!storeConnection?.credentials_encrypted) {
    return NextResponse.json({ error: 'Shopify credentials are missing. Reconnect Shopify.' }, { status: 400 });
  }

  shopifyDebugLog('sync_orders.session', {
    merchantId: ctx.merchantId,
    userId: user.id,
    shopDomain,
    connected: connection.connected,
  });

  try {
    const credentials = decryptBigCommerceOAuthCredentials(storeConnection.credentials_encrypted);
    const result = await backfillShopifyMerchantIdentities({
      supabase: serviceClient,
      shopDomain,
      accessToken: credentials.access_token,
      merchantId: ctx.merchantId,
    });

    shopifyDebugLog('sync_orders.complete', {
      merchantId: ctx.merchantId,
      shopDomain,
      ...result,
    });

    return NextResponse.json({
      ok: true,
      shopDomain,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'shopify_order_sync_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
