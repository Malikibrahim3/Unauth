import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';
import { SHOPIFY_SCOPES } from '@/lib/shopify/client';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const [connection, signalResult] = await Promise.all([
    getShopifyConnectionStatus(serviceClient, ctx.merchantId),
    serviceClient
      .from('shopify_order_signals' as never)
      .select('created_at_shopify')
      .eq('merchant_id', ctx.merchantId)
      .order('created_at_shopify', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!connection.connected || !connection.shopDomain) {
    return NextResponse.json({
      connected: false,
      linkState: connection.linkState,
      shopDomain: connection.shopDomain,
      scopes: [...SHOPIFY_SCOPES],
      dataSources: ['CSV upload', 'Shopify orders (when connected)'],
    });
  }

  const shopDomain = connection.shopDomain;

  const [countResult, webhookResult, webhookHealthResult, recentWebhooksResult] = await Promise.all([
    serviceClient
      .from('shopify_order_signals' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', ctx.merchantId),
    serviceClient
      .from('processed_webhooks' as never)
      .select('created_at,topic,status')
      .eq('shop_domain', shopDomain)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from('processed_webhooks' as never)
      .select('status', { count: 'exact', head: true })
      .eq('shop_domain', shopDomain)
      .eq('status', 'failed'),
    serviceClient
      .from('processed_webhooks' as never)
      .select('created_at,topic,status')
      .eq('shop_domain', shopDomain)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const lastSignal = signalResult.data as { created_at_shopify?: string | null } | null;
  const lastWebhook = webhookResult.data as { created_at?: string; topic?: string | null; status?: string | null } | null;
  const recentWebhooks = (recentWebhooksResult.data ?? []) as Array<{
    created_at: string;
    topic: string | null;
    status: string | null;
  }>;

  return NextResponse.json({
    connected: true,
    linkState: connection.linkState,
    shopDomain,
    lastOrderSyncedAt: lastSignal?.created_at_shopify ?? null,
    lastWebhookAt: lastWebhook?.created_at ?? null,
    lastWebhookTopic: lastWebhook?.topic ?? null,
    lastWebhookStatus: lastWebhook?.status ?? null,
    orderCount: countResult.count ?? 0,
    lastError: connection.lastError,
    scopes: [...SHOPIFY_SCOPES],
    dataSources: ['Shopify live sync', 'CSV historical import'],
    webhookFailures: webhookHealthResult.count ?? 0,
    recentWebhooks: recentWebhooks.map((row) => ({
      at: row.created_at,
      topic: row.topic,
      status: row.status ?? 'received',
    })),
  });
}
