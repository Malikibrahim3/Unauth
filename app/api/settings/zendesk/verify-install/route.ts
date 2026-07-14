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
  } catch {
    return NextResponse.json({ error: 'Failed to verify Zendesk install.', code: 'zendesk_install_verification_failed' }, { status: 500 });
  }
}

export const POST = withRequestLogging('/api/settings/zendesk/verify-install', POSTHandler);
