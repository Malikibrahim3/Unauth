import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { backfillFreshdeskSupportCases } from '@/lib/support/freshdesk/backfill';
import { getMerchantFreshdeskSupportConnection } from '@/lib/support/freshdesk/settingsConnection';

export const maxDuration = 300;

async function POSTHandler() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const connection = await getMerchantFreshdeskSupportConnection(service, ctx.merchantId);
  if (!connection || connection.status !== 'active' || !connection.freshdesk_api_configured) {
    return NextResponse.json(
      { error: 'Freshdesk API credentials are not configured. Save your domain and API key first.' },
      { status: 400 },
    );
  }

  try {
    const orderSource = await getConnectionState(service, ctx.merchantId);
    const result = await backfillFreshdeskSupportCases({
      supabase: service,
      merchantId: ctx.merchantId,
      providerConnectionId: connection.id,
      shopDomain: orderSource.orderSourceStoreKey,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'freshdesk_backfill_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withRequestLogging(
  '/api/settings/freshdesk/support-connection/sync',
  POSTHandler,
);
