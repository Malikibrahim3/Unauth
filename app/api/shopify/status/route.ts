import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';
import { SHOPIFY_SCOPES } from '@/lib/shopify/scopes';

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
      dataSources: ['Shopify orders (when connected)', 'Helpdesk claims (when connected)'],
    });
  }

  const shopDomain = connection.shopDomain;
  const merchantId = ctx.merchantId;

  // v2: Shopify orders live in the merchant-scoped `source_orders` table
  // (source='shopify'). Webhook delivery telemetry remains in the shared
  // processed_webhooks table and is surfaced below from the active store key.
  const [countResult, lastOrderResult, scopeResult, lastWebhookResult, failedWebhookResult, recentWebhooksResult] = await Promise.all([
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
    serviceClient
      .from('store_connections')
      .select('scopes')
      .eq('merchant_id', merchantId)
      .eq('platform', 'shopify')
      .eq('store_key', shopDomain)
      .order('installed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from('processed_webhooks')
      .select('processed_at,topic,status')
      .eq('platform', 'shopify')
      .eq('store_key', shopDomain)
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from('processed_webhooks')
      .select('idempotency_key', { count: 'exact', head: true })
      .eq('platform', 'shopify')
      .eq('store_key', shopDomain)
      .eq('status', 'failed'),
    serviceClient
      .from('processed_webhooks')
      .select('processed_at,topic,status')
      .eq('platform', 'shopify')
      .eq('store_key', shopDomain)
      .order('processed_at', { ascending: false })
      .limit(5),
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
  const grantedScopes = Array.isArray(scopeResult.data?.scopes)
    ? scopeResult.data.scopes.map(String).filter(Boolean)
    : [];
  const lastWebhook = lastWebhookResult.data as { processed_at?: string; topic?: string | null; status?: string | null } | null;
  const recentWebhooks = ((recentWebhooksResult.data ?? []) as Array<{ processed_at?: string; topic?: string | null; status?: string | null }>)
    .filter((row) => row.processed_at)
    .map((row) => ({ at: row.processed_at as string, topic: row.topic ?? null, status: row.status ?? 'unknown' }));

  return NextResponse.json({
    connected: true,
    linkState: connection.linkState,
    shopDomain,
    lastOrderSyncedAt: lastOrder?.placed_at ?? lastOrder?.ingested_at ?? null,
    lastWebhookAt: lastWebhook?.processed_at ?? null,
    lastWebhookTopic: lastWebhook?.topic ?? null,
    lastWebhookStatus: lastWebhook?.status ?? null,
    orderCount,
    auditTransactionCount: orderCount,
    lastError: connection.lastError,
    scopes: grantedScopes,
    dataSources: ['Shopify live sync', 'Legacy historical context'],
    webhookFailures: failedWebhookResult.count ?? 0,
    recentWebhooks,
  });
}
