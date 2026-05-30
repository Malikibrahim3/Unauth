import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { backfillShopifyAuditTransactions } from '@/lib/shopify/auditBridge';
import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';
import { shopifyAuditError, shopifyAuditLog } from '@/lib/shopify/auditLog';

/** Allow large Shopify backfills on Vercel (same as CSV processing routes). */
export const maxDuration = 300;

/**
 * Score existing shopify_order_signals into audit_transactions (manual / reconnect follow-up).
 */
export async function POST() {
  console.log('[shopify.sync-audit] POST handler hit');
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

  shopifyAuditLog('sync_audit.session', {
    merchantId: ctx.merchantId,
    userId: user.id,
    shopDomain,
    connected: connection.connected,
  });

  try {
    const result = await backfillShopifyAuditTransactions({
      supabase: serviceClient,
      shopDomain,
      merchantId: ctx.merchantId,
    });

    shopifyAuditLog('sync_audit.complete', {
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
    shopifyAuditError('sync_audit.route_failed', err, { shopDomain, merchantId: ctx.merchantId });
    const message = err instanceof Error ? err.message : 'audit_sync_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
