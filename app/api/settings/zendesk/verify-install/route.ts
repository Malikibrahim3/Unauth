import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { upsertSupportProviderConnection } from '@/lib/support/intake/store';
import { withRequestLogging } from '@/lib/log';

async function POSTHandler() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  try {
    await upsertSupportProviderConnection(service, {
      merchant_id: ctx.merchantId,
      provider: 'zendesk',
      provider_account_id: null,
      status: 'active',
    });
    return NextResponse.json({ ok: true, connected: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to verify Zendesk install';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withRequestLogging('/api/settings/zendesk/verify-install', POSTHandler);
