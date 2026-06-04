import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { backfillZendeskSupportCases } from '@/lib/support/zendesk/backfill';
import {
  createMerchantZendeskSupportConnection,
  getMerchantZendeskSupportConnection,
  updateMerchantZendeskSupportConnection,
  zendeskSupportConnectionInputSchema,
} from '@/lib/support/zendesk/settingsConnection';
import {
  ZENDESK_CONNECT_CREDENTIALS_ERROR,
  ZENDESK_CONNECT_CREDENTIALS_ERROR_CODE,
  ZendeskCredentialsError,
} from '@/lib/support/zendesk/supportConnectionShared';

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
    const connection = await getMerchantZendeskSupportConnection(service, ctx.merchantId);
    return NextResponse.json({
      connection,
      connected: Boolean(connection?.status === 'active' && connection.zendesk_api_configured),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Zendesk connection';
    return NextResponse.json({ error: message }, { status: 500 });
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

  const parsed = zendeskSupportConnectionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const existing = await getMerchantZendeskSupportConnection(service, ctx.merchantId);

    const saved =
      existing?.status === 'active' && existing.zendesk_api_configured
        ? await updateMerchantZendeskSupportConnection(service, ctx.merchantId, parsed.data)
        : await createMerchantZendeskSupportConnection(service, ctx.merchantId, parsed.data);

    logAction({
      ctx,
      action:
        existing?.zendesk_api_configured ? 'update_zendesk_support_connection' : 'create_zendesk_support_connection',
      resourceType: 'support_provider_connection',
      resourceId: saved.connection.id,
      metadata: { provider_account_id: saved.connection.provider_account_id },
      ip,
    });

    const merchantId = ctx.merchantId;
    const connectionId = saved.connection.id;
    after(async () => {
      try {
        const orderSource = await getConnectionState(service, merchantId);
        await backfillZendeskSupportCases({
          supabase: service,
          merchantId,
          providerConnectionId: connectionId,
          shopDomain: orderSource.orderSourceStoreKey,
        });
      } catch (err) {
        console.error('Zendesk historical ticket backfill failed', {
          merchantId,
          connectionId,
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    });

    return NextResponse.json({
      connection: saved.connection,
      connected: true,
    });
  } catch (err) {
    if (err instanceof ZendeskCredentialsError) {
      return NextResponse.json(
        { error: ZENDESK_CONNECT_CREDENTIALS_ERROR, code: ZENDESK_CONNECT_CREDENTIALS_ERROR_CODE },
        { status: 422 },
      );
    }
    if (err instanceof Error && err.message === 'zendesk_connection_already_exists') {
      return NextResponse.json({ error: 'Zendesk connection already exists' }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Failed to save Zendesk connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withRequestLogging('/api/settings/zendesk/connection', GETHandler);
export const POST = withRequestLogging('/api/settings/zendesk/connection', POSTHandler);
