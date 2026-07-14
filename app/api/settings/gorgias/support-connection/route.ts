import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import {
  createMerchantGorgiasSupportConnection,
  getMerchantGorgiasSupportConnection,
  GorgiasCredentialsError,
  gorgiasSupportConnectionInputSchema,
  refreshMerchantGorgiasSidebarWidgetUrlBestEffort,
  updateMerchantGorgiasSupportConnectionMetadata,
} from '@/lib/support/gorgias/settingsConnection';
import {
  GORGIAS_CONNECT_CREDENTIALS_ERROR,
  GORGIAS_CONNECT_CREDENTIALS_ERROR_CODE,
} from '@/lib/support/gorgias/supportConnectionShared';
import { evaluateGorgiasHelpdeskLink } from '@/lib/support/gorgias/helpdeskLinkStatus';
import { backfillGorgiasSupportCases } from '@/lib/support/gorgias/backfill';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { safeConnectionErrorCode } from '@/lib/integrations/publicErrors';

function scheduleGorgiasBackfill(
  service: ReturnType<typeof createServiceClient>,
  merchantId: string,
  connectionId: string,
) {
  after(async () => {
    try {
      const orderSource = await getConnectionState(service, merchantId);
      await backfillGorgiasSupportCases({
        supabase: service,
        merchantId,
        providerConnectionId: connectionId,
        shopDomain: orderSource.orderSourceStoreKey,
      });
    } catch (err) {
      console.error('Gorgias historical ticket backfill failed', {
        merchantId,
        connectionId,
        category: safeConnectionErrorCode(err instanceof Error ? err.message : null)
          ?? 'gorgias_backfill_failed',
      });
    }
  });
}

async function GETHandler() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;

  try {
    await refreshMerchantGorgiasSidebarWidgetUrlBestEffort(service, ctx.merchantId);
    const connection = await getMerchantGorgiasSupportConnection(service, ctx.merchantId);
    const link = evaluateGorgiasHelpdeskLink(connection);
    return NextResponse.json({ connection, link });
  } catch {
    return NextResponse.json({ error: 'Failed to load Gorgias connection.', code: 'gorgias_connection_load_failed' }, { status: 500 });
  }
}

async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = gorgiasSupportConnectionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const existing = await getMerchantGorgiasSupportConnection(service, ctx.merchantId);

    // Route a cleanly disabled+wiped connection through create (re-registers webhook + secret).
    // Any other existing connection (active, error, or disabled with credentials still stored)
    // goes through the update path.
    if (existing && !(existing.status === 'disabled' && !existing.gorgias_api_configured)) {
      const updated = await updateMerchantGorgiasSupportConnectionMetadata(
        service,
        ctx.merchantId,
        parsed.data
      );

      logAction({
        ctx,
        action: 'update_gorgias_support_connection',
        resourceType: 'support_provider_connection',
        resourceId: updated.connection.id,
        metadata: {
          provider_account_id: updated.connection.provider_account_id,
          status: updated.connection.status,
        },
        ip,
      });

      if (updated.connection.status === 'active' && updated.connection.gorgias_api_configured) {
        scheduleGorgiasBackfill(service, ctx.merchantId, updated.connection.id);
      }

      return NextResponse.json({
        connection: updated.connection,
        sidebar_widget: updated.sidebar_widget,
      });
    }

    const created = await createMerchantGorgiasSupportConnection(
      service,
      ctx.merchantId,
      parsed.data
    );

    logAction({
      ctx,
      action: 'create_gorgias_support_connection',
      resourceType: 'support_provider_connection',
      resourceId: created.connection.id,
      metadata: {
        provider_account_id: created.connection.provider_account_id,
      },
      ip,
    });

    const merchantId = ctx.merchantId;
    const connectionId = created.connection.id;
    scheduleGorgiasBackfill(service, merchantId, connectionId);

    return NextResponse.json(created);
  } catch (err) {
    if (err instanceof GorgiasCredentialsError) {
      return NextResponse.json(
        { error: GORGIAS_CONNECT_CREDENTIALS_ERROR, code: GORGIAS_CONNECT_CREDENTIALS_ERROR_CODE },
        { status: 422 }
      );
    }
    if (err instanceof Error && err.message === 'gorgias_connection_already_exists') {
      return NextResponse.json({ error: 'Gorgias connection already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save Gorgias connection.', code: 'gorgias_connection_save_failed' }, { status: 500 });
  }
}

export const GET = withRequestLogging('/api/settings/gorgias/support-connection', GETHandler);
export const POST = withRequestLogging('/api/settings/gorgias/support-connection', POSTHandler);
