import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { backfillZendeskSupportCases } from '@/lib/support/zendesk/backfill';
import { getMerchantZendeskSupportConnection } from '@/lib/support/zendesk/settingsConnection';

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

  const connection = await getMerchantZendeskSupportConnection(service, ctx.merchantId);
  if (!connection || connection.status !== 'active' || !connection.zendesk_api_configured) {
    return NextResponse.json(
      { error: 'Zendesk API credentials are not configured. Save your subdomain and API token first.' },
      { status: 400 },
    );
  }

  try {
    const orderSource = await getConnectionState(service, ctx.merchantId);
    const result = await backfillZendeskSupportCases({
      supabase: service,
      merchantId: ctx.merchantId,
      providerConnectionId: connection.id,
      shopDomain: orderSource.orderSourceStoreKey,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: 'Zendesk sync failed.', code: 'zendesk_backfill_failed' }, { status: 500 });
  }
}

export const POST = withRequestLogging('/api/settings/zendesk/sync', POSTHandler);
