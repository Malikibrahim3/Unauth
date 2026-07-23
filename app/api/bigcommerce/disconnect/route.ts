import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
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
    const connection = await disableMerchantBigCommerceConnection(
      createServiceClient({ audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip } }),
      ctx.merchantId,
    );

    return NextResponse.json({ connection });
  } catch (err) {
    if (err instanceof Error && err.message === 'bigcommerce_connection_not_found') {
      return NextResponse.json({ error: 'BigCommerce connection not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to disconnect BigCommerce', code: 'bigcommerce_disconnect_failed' }, { status: 500 });
  }
}
