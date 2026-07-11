import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { requireIntegrationProvider } from '@/lib/integrations/registry';
import { disconnectProviderConnection } from '@/lib/connectors/disconnect';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = requireIntegrationProvider(providerId);
  if (provider.buildStatus === 'slot_only') {
    return NextResponse.json({ error: 'Provider is available on request and is not connected.' }, { status: 400 });
  }

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  // Category-driven disconnect (no provider-id branching) + canonical mirror.
  try {
    await disconnectProviderConnection(serviceClient, ctx.merchantId, {
      id: provider.id,
      category: provider.category,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'disconnect_failed';
    return NextResponse.json({ error: `Failed to disconnect ${provider.name}`, detail: message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, provider: provider.id, status: 'not_connected' });
}
