import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
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

  const { data, error } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .update({ revoked_at: revokedAt })
    .eq('id', keyId)
    .eq('merchant_id', ctx.merchantId)
    .is('revoked_at', null)
    .select('id, key_prefix, name')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  logAction({
    ctx,
    action: 'revoke_api_key',
    resourceType: 'merchant_api_key',
    resourceId: keyId,
    metadata: { key_prefix: (data as { key_prefix: string }).key_prefix },
    ip,
  });

  return NextResponse.json({ ok: true });
}

export const DELETE = withRequestLogging('/api/settings/api-keys/[keyId]', DELETEHandler);
