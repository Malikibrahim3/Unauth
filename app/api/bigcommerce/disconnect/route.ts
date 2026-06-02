import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { getClientIp } from '@/lib/ratelimit';
import { disableMerchantBigCommerceConnection } from '@/lib/commerce/bigcommerce/connectionSettings';

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

  try {
    const connection = await disableMerchantBigCommerceConnection(service, ctx.merchantId);

    logAction({
      ctx,
      action: 'disconnect_bigcommerce',
      resourceType: 'commerce_store_connection',
      resourceId: connection.id,
      metadata: { store_key: connection.store_key },
      ip,
    });

    return NextResponse.json({ connection });
  } catch (err) {
    if (err instanceof Error && err.message === 'bigcommerce_connection_not_found') {
      return NextResponse.json({ error: 'BigCommerce connection not found' }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : 'Failed to disconnect BigCommerce';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
