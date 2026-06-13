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

  const connection = await getShopifyConnectionStatus(serviceClient, ctx.merchantId);

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
  const merchantId = ctx.merchantId;

  // v2: Shopify orders live in the merchant-scoped `source_orders` table
  // (source='shopify'). The legacy signal/audit distinction collapses into a
  // single store of ingested orders. Webhook delivery telemetry
  // (`processed_webhooks`) has no v2 equivalent yet, so it degrades to null/zero.
  const [countResult, lastOrderResult] = await Promise.all([
    serviceClient
      .from('source_orders')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('source', 'shopify'),
    serviceClient
      .from('source_orders')
      .select('placed_at, ingested_at')
      .eq('merchant_id', merchantId)
      .eq('source', 'shopify')
      .order('placed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lastOrder = lastOrderResult.data as { placed_at?: string | null; ingested_at?: string | null } | null;
  if (countResult.error || lastOrderResult.error) {
    console.error('shopify status order query failed', {
      merchantId,
      shopDomain,
      countError: countResult.error?.message,
      lastOrderError: lastOrderResult.error?.message,
    });
  }
  const orderCount = countResult.count ?? 0;

  return NextResponse.json({
    connected: true,
    linkState: connection.linkState,
    shopDomain,
    lastOrderSyncedAt: lastOrder?.placed_at ?? lastOrder?.ingested_at ?? null,
    lastWebhookAt: null,
    lastWebhookTopic: null,
    lastWebhookStatus: null,
    orderCount,
    auditTransactionCount: orderCount,
    lastError: connection.lastError,
    scopes: [...SHOPIFY_SCOPES],
    dataSources: ['Shopify live sync', 'CSV historical import'],
    webhookFailures: 0,
    recentWebhooks: [],
  });
}
