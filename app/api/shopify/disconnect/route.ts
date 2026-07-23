import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { disconnectProviderConnection } from '@/lib/connectors/disconnect';
import { resolveActiveIntegrationConnectionId } from '@/lib/integrations/auth';

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

  const connectionId = await resolveActiveIntegrationConnectionId(service, ctx.merchantId, 'shopify');
  if (!connectionId) return NextResponse.json({ error: 'Shopify is not connected.' }, { status: 400 });
  try {
    await disconnectProviderConnection(createServiceClient({
      audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip },
    }), ctx.merchantId, {
      id: 'shopify',
      category: 'commerce',
    }, connectionId);
  } catch {
    return NextResponse.json({ error: 'Failed to disconnect Shopify' }, { status: 500 });
  }

  return NextResponse.json({ disconnected: true });
}
