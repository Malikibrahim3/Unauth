import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
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
    const connection = await disableMerchantGorgiasSupportConnection(service, ctx.merchantId);

    logAction({
      ctx,
      action: 'disable_gorgias_support_connection',
      resourceType: 'support_provider_connection',
      resourceId: connection.id,
      metadata: {},
      ip,
    });

    return NextResponse.json({ connection });
  } catch (err) {
    if (err instanceof Error && err.message === 'gorgias_connection_not_found') {
      return NextResponse.json({ error: 'Gorgias connection not found' }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : 'Failed to disable Gorgias connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withRequestLogging(
  '/api/settings/gorgias/support-connection/disable',
  POSTHandler
);
