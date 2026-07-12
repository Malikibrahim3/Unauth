import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { getClientIp } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const now = new Date().toISOString();
  const { error } = await service
    .from('store_connections')
    .update({ status: 'revoked', uninstalled_at: now, updated_at: now })
    .eq('merchant_id', ctx.merchantId)
    .eq('platform', 'shopify');

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect Shopify' }, { status: 500 });
  }

  const { error: canonicalError } = await service
    .from('merchant_integrations')
    .update({
      status: 'revoked',
      disconnected_at: now,
      webhook_status: 'missing',
      updated_at: now,
    })
    .eq('merchant_id', ctx.merchantId)
    .eq('provider_id', 'shopify');

  if (canonicalError) {
    return NextResponse.json({ error: 'Failed to update Shopify integration status' }, { status: 500 });
  }

  logAction({
    ctx,
    action: 'disconnect_shopify',
    resourceType: 'store_connection',
    resourceId: ctx.merchantId,
    metadata: { platform: 'shopify' },
    ip,
  });

  return NextResponse.json({ disconnected: true });
}
