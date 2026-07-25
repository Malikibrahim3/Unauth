import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

async function DELETEHandler(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const ip = getClientIp(req.headers);
  const { keyId } = await params;

  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const revokedAt = new Date().toISOString();

  const mutationClient = createServiceClient({
    audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip },
  });
  const { data, error } = await mutationClient.rpc('revoke_merchant_api_key', {
    p_merchant_id: ctx.merchantId,
    p_api_key_id: keyId,
    p_revoked_at: revokedAt,
  });

  if (error) {
    if (error.code === 'P0002' || error.message?.includes('api_key_not_found')) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export const DELETE = withRequestLogging('/api/settings/api-keys/[keyId]', DELETEHandler);
