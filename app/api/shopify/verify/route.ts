import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import {
  persistLiveVerification,
  verifyShopifyConnection,
  type ShopifyVerificationRow,
} from '@/lib/connections/liveVerification';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { data: row } = await serviceClient
    .from('store_connections')
    .select('id,credentials_encrypted,store_key,status,uninstalled_at')
    .eq('merchant_id', ctx.merchantId)
    .eq('platform', 'shopify')
    .order('installed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, reason: 'not_connected' });
  }

  const result = await verifyShopifyConnection(row as ShopifyVerificationRow);
  await persistLiveVerification(serviceClient, 'store_connections', ctx.merchantId, row.id, row.status, result);
  if (result.status === 'verified') {
    return NextResponse.json({ ok: true });
  }
  if (result.status === 'inconclusive') {
    return NextResponse.json({ ok: false, reason: result.reason ?? 'network_error', inconclusive: true });
  }
  return NextResponse.json({ ok: false, reason: result.reason ?? 'token_revoked' });
}
