import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { disconnectIntegration } from '@/lib/integrations/auth';
import { requireIntegrationProvider } from '@/lib/integrations/registry';

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

  if (provider.id === 'shopify') {
    const { error } = await serviceClient
      .from('store_connections')
      .update({ status: 'revoked', uninstalled_at: new Date().toISOString() })
      .eq('merchant_id', ctx.merchantId)
      .eq('platform', 'shopify');
    if (error) return NextResponse.json({ error: 'Failed to disconnect Shopify' }, { status: 500 });
    return NextResponse.json({ ok: true, provider: provider.id, status: 'not_connected' });
  }

  if (provider.id === 'gorgias') {
    const { error } = await serviceClient
      .from('helpdesk_connections')
      .update({ status: 'revoked' })
      .eq('merchant_id', ctx.merchantId)
      .eq('provider', 'gorgias');
    if (error) return NextResponse.json({ error: 'Failed to disconnect Gorgias' }, { status: 500 });
    return NextResponse.json({ ok: true, provider: provider.id, status: 'not_connected' });
  }

  await disconnectIntegration(serviceClient, ctx.merchantId, provider.id);
  return NextResponse.json({ ok: true, provider: provider.id, status: 'not_connected' });
}
