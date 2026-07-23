import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import { disableMerchantGorgiasSupportConnection } from '@/lib/support/gorgias/settingsConnection';

async function POSTHandler(req: Request) {
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
    const connection = await disableMerchantGorgiasSupportConnection(
      createServiceClient({ audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip } }),
      ctx.merchantId,
    );

    return NextResponse.json({ connection });
  } catch (err) {
    if (err instanceof Error && err.message === 'gorgias_connection_not_found') {
      return NextResponse.json({ error: 'Gorgias connection not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to disable Gorgias connection.', code: 'gorgias_disconnect_failed' }, { status: 500 });
  }
}

export const POST = withRequestLogging(
  '/api/settings/gorgias/support-connection/disable',
  POSTHandler
);
