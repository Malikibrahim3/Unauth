import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const [connResult, signalResult, webhookResult] = await Promise.all([
    serviceClient
      .from('merchant_shopify_connections' as any)
      .select('shop_domain,active,created_at,last_error')
      .eq('merchant_id', ctx.merchantId)
      .eq('active', true)
      .maybeSingle(),
    serviceClient
      .from('shopify_order_signals' as any)
      .select('created_at_shopify')
      .eq('merchant_id', ctx.merchantId)
      .order('created_at_shopify', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from('processed_webhooks' as any)
      .select('created_at,topic')
      .eq('merchant_id', ctx.merchantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const connection = connResult.data as any;
  const lastSignal = signalResult.data as any;
  const lastWebhook = webhookResult.data as any;

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  const { count } = await serviceClient
    .from('shopify_order_signals' as any)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', ctx.merchantId);

  return NextResponse.json({
    connected: true,
    shopDomain: connection.shop_domain as string,
    lastOrderSyncedAt: lastSignal?.created_at_shopify ?? null,
    lastWebhookAt: lastWebhook?.created_at ?? null,
    lastWebhookTopic: lastWebhook?.topic ?? null,
    orderCount: count ?? 0,
    lastError: connection.last_error ?? null,
  });
}
