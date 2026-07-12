import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { requireIntegrationProvider } from '@/lib/integrations/registry';
import { disconnectProviderConnection } from '@/lib/connectors/disconnect';
import { recordShipBobAudit } from '@/lib/integrations/providers/shipbobAudit';

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
    const { data: shipBobConnection } = provider.id === 'shipbob'
      ? await serviceClient.from('merchant_integrations').select('id,environment').eq('merchant_id', ctx.merchantId).eq('provider_id', 'shipbob').maybeSingle()
      : { data: null };
    await disconnectProviderConnection(serviceClient, ctx.merchantId, {
      id: provider.id,
      category: provider.category,
    });
    if (provider.id === 'shipbob') await recordShipBobAudit(serviceClient, {
      merchantId: ctx.merchantId, actorUserId: user.id, connectionId: shipBobConnection?.id,
      environment: shipBobConnection?.environment === 'sandbox' ? 'sandbox' : 'production',
      action: 'shipbob_disconnected', status: 'completed',
    });
    if (provider.id === 'shipbob') await recordShipBobAudit(serviceClient, {
      merchantId: ctx.merchantId, actorUserId: user.id, connectionId: shipBobConnection?.id,
      environment: shipBobConnection?.environment === 'sandbox' ? 'sandbox' : 'production',
      action: 'shipbob_webhook_subscription_removed', status: 'completed',
      metadata: { cleanup: 'best_effort_disconnect_cleanup' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'disconnect_failed';
    return NextResponse.json({ error: `Failed to disconnect ${provider.name}`, detail: message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, provider: provider.id, status: 'not_connected' });
}
