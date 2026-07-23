import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import { rotateMerchantFreshdeskWebhookSecret } from '@/lib/support/freshdesk/settingsConnection';

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
    const rotated = await rotateMerchantFreshdeskWebhookSecret(
      createServiceClient({ audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip } }),
      ctx.merchantId,
    );

    return NextResponse.json(rotated);
  } catch (err) {
    if (err instanceof Error && err.message === 'freshdesk_connection_not_found') {
      return NextResponse.json({ error: 'Freshdesk connection not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to rotate webhook secret.', code: 'freshdesk_secret_rotation_failed' }, { status: 500 });
  }
}

export const POST = withRequestLogging(
  '/api/settings/freshdesk/support-connection/rotate-secret',
  POSTHandler
);
