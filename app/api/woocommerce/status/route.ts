import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getCommercePlatformConnectionStatus } from '@/lib/commerce/connectionStatus';
import { TABLES } from '@/lib/supabase/tables';

export async function GET() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const connection = await getCommercePlatformConnectionStatus(
    serviceClient,
    ctx.merchantId,
    'woocommerce',
  );

  if (!connection.connected || !connection.storeKey) {
    return NextResponse.json({
      connected: false,
      storeKey: connection.storeKey,
      lastError: connection.lastError,
    });
  }

  const storeKey = connection.storeKey;

  const [auditCountResult, lastAuditResult, webhookResult, webhookHealthResult, recentWebhooksResult] =
    await Promise.all([
      serviceClient
        .from(TABLES.AUDIT_TRANSACTIONS)
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', ctx.merchantId)
        .eq('source', 'woocommerce'),
      serviceClient
        .from(TABLES.AUDIT_TRANSACTIONS)
        .select('processed_at')
        .eq('merchant_id', ctx.merchantId)
        .eq('source', 'woocommerce')
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      serviceClient
        .from('processed_webhooks' as never)
        .select('processed_at,topic,status')
        .eq('provider', 'woocommerce')
        .eq('store_key', storeKey)
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      serviceClient
        .from('processed_webhooks' as never)
        .select('status', { count: 'exact', head: true })
        .eq('provider', 'woocommerce')
        .eq('store_key', storeKey)
        .eq('status', 'failed'),
      serviceClient
        .from('processed_webhooks' as never)
        .select('processed_at,topic,status')
        .eq('provider', 'woocommerce')
        .eq('store_key', storeKey)
        .order('processed_at', { ascending: false })
        .limit(5),
    ]);

  const lastAudit = lastAuditResult.data as { processed_at?: string } | null;
  const lastWebhook = webhookResult.data as {
    processed_at?: string;
    topic?: string | null;
    status?: string | null;
  } | null;
  const recentWebhooks = (recentWebhooksResult.data ?? []) as Array<{
    processed_at: string;
    topic: string | null;
    status: string | null;
  }>;

  return NextResponse.json({
    connected: true,
    storeKey,
    storeDomain: storeKey,
    lastOrderSyncedAt: lastAudit?.processed_at ?? null,
    lastWebhookAt: lastWebhook?.processed_at ?? null,
    lastWebhookTopic: lastWebhook?.topic ?? null,
    lastWebhookStatus: lastWebhook?.status ?? null,
    auditTransactionCount: auditCountResult.count ?? 0,
    lastError: connection.lastError,
    webhookFailures: webhookHealthResult.count ?? 0,
    recentWebhooks: recentWebhooks.map((row) => ({
      at: row.processed_at,
      topic: row.topic,
      status: row.status ?? 'received',
    })),
  });
}
