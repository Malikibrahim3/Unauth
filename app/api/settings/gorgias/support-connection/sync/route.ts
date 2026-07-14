import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { backfillGorgiasSupportCases } from '@/lib/support/gorgias/backfill';
import { getMerchantGorgiasSupportConnection } from '@/lib/support/gorgias/settingsConnection';
import { reconcilePayoutCasesFromTickets } from '@/lib/support/intake/reconcilePayoutCasesFromTickets';

/** Allow large helpdesk backfills on Vercel (same pattern as Shopify sync-audit). */
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

  const connection = await getMerchantGorgiasSupportConnection(service, ctx.merchantId);
  if (!connection || connection.status !== 'active' || !connection.gorgias_api_configured) {
    return NextResponse.json({ error: 'Gorgias is not connected' }, { status: 400 });
  }

  try {
    const orderSource = await getConnectionState(service, ctx.merchantId);
    const result = await backfillGorgiasSupportCases({
      supabase: service,
      merchantId: ctx.merchantId,
      providerConnectionId: connection.id,
      shopDomain: orderSource.orderSourceStoreKey,
    });
    const bridge = await reconcilePayoutCasesFromTickets({
      supabase: service,
      merchantId: ctx.merchantId,
    });
    return NextResponse.json({ ok: true, ...result, payout_case_bridge: bridge });
  } catch {
    return NextResponse.json({ error: 'Gorgias sync failed.', code: 'gorgias_backfill_failed' }, { status: 500 });
  }
}

export const POST = withRequestLogging(
  '/api/settings/gorgias/support-connection/sync',
  POSTHandler,
);
