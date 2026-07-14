import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { backfillFreshdeskSupportCases } from '@/lib/support/freshdesk/backfill';
import {
  createMerchantFreshdeskSupportConnection,
  getMerchantFreshdeskSupportConnection,
  freshdeskSupportConnectionInputSchema,
  updateMerchantFreshdeskSupportConnectionMetadata,
} from '@/lib/support/freshdesk/settingsConnection';
import { FreshdeskCredentialsError } from '@/lib/support/freshdesk/supportConnectionShared';
import {
  FRESHDESK_CONNECT_CREDENTIALS_ERROR,
  FRESHDESK_CONNECT_CREDENTIALS_ERROR_CODE,
} from '@/lib/support/freshdesk/supportConnectionShared';
import { safeConnectionErrorCode } from '@/lib/integrations/publicErrors';

function scheduleFreshdeskBackfill(
  service: ReturnType<typeof createServiceClient>,
  merchantId: string,
  connectionId: string,
) {
  after(async () => {
    try {
      const orderSource = await getConnectionState(service, merchantId);
      await backfillFreshdeskSupportCases({
        supabase: service,
        merchantId,
        providerConnectionId: connectionId,
        shopDomain: orderSource.orderSourceStoreKey,
      });
    } catch (err) {
      console.error('Freshdesk historical ticket backfill failed', {
        merchantId,
        connectionId,
        category: safeConnectionErrorCode(err instanceof Error ? err.message : null)
          ?? 'freshdesk_backfill_failed',
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
    const connection = await getMerchantFreshdeskSupportConnection(service, ctx.merchantId);
    return NextResponse.json({ connection });
  } catch {
    return NextResponse.json({ error: 'Failed to load Freshdesk connection.', code: 'freshdesk_connection_load_failed' }, { status: 500 });
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

  const parsed = freshdeskSupportConnectionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const existing = await getMerchantFreshdeskSupportConnection(service, ctx.merchantId);

    if (existing && !(existing.status === 'disabled' && !existing.freshdesk_api_configured)) {
      const updated = await updateMerchantFreshdeskSupportConnectionMetadata(
        service,
        ctx.merchantId,
        parsed.data
      );

      logAction({
        ctx,
        action: 'update_freshdesk_support_connection',
        resourceType: 'support_provider_connection',
        resourceId: updated.connection.id,
        metadata: {
          provider_account_id: updated.connection.provider_account_id,
          status: updated.connection.status,
        },
        ip,
      });

      if (updated.connection.status === 'active' && updated.connection.freshdesk_api_configured) {
        scheduleFreshdeskBackfill(service, ctx.merchantId, updated.connection.id);
      }

      return NextResponse.json({ connection: updated.connection });
    }

    const created = await createMerchantFreshdeskSupportConnection(
      service,
      ctx.merchantId,
      parsed.data
    );

    logAction({
      ctx,
      action: 'create_freshdesk_support_connection',
      resourceType: 'support_provider_connection',
      resourceId: created.connection.id,
      metadata: {
        provider_account_id: created.connection.provider_account_id,
      },
      ip,
    });

    scheduleFreshdeskBackfill(service, ctx.merchantId, created.connection.id);

    return NextResponse.json(created);
  } catch (err) {
    if (err instanceof FreshdeskCredentialsError) {
      return NextResponse.json(
        {
          error: FRESHDESK_CONNECT_CREDENTIALS_ERROR,
          code: FRESHDESK_CONNECT_CREDENTIALS_ERROR_CODE,
        },
        { status: 422 }
      );
    }
    if (err instanceof Error && err.message === 'freshdesk_connection_already_exists') {
      return NextResponse.json({ error: 'Freshdesk connection already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save Freshdesk connection.', code: 'freshdesk_connection_save_failed' }, { status: 500 });
  }
}

export const GET = withRequestLogging('/api/settings/freshdesk/support-connection', GETHandler);
export const POST = withRequestLogging('/api/settings/freshdesk/support-connection', POSTHandler);
