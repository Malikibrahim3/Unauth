import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
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
import { evaluateZendeskHelpdeskLink } from '@/lib/support/zendesk/helpdeskLinkStatus';
import {
  ZENDESK_CONNECT_CREDENTIALS_ERROR,
  ZENDESK_CONNECT_CREDENTIALS_ERROR_CODE,
  ZendeskCredentialsError,
} from '@/lib/support/zendesk/supportConnectionShared';
import { safeConnectionErrorCode } from '@/lib/integrations/publicErrors';

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
    const link = evaluateZendeskHelpdeskLink(connection);
    return NextResponse.json({
      connection,
      link,
      connected: link.helpdeskLinked,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load Zendesk connection.', code: 'zendesk_connection_load_failed' }, { status: 500 });
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
  const mutationService = createServiceClient({
    audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip },
  });

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
        ? await updateMerchantZendeskSupportConnection(mutationService, ctx.merchantId, parsed.data)
        : await createMerchantZendeskSupportConnection(mutationService, ctx.merchantId, parsed.data);

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
          category: safeConnectionErrorCode(err instanceof Error ? err.message : null)
            ?? 'zendesk_backfill_failed',
        });
      }
    });

    const link = evaluateZendeskHelpdeskLink(saved.connection);
    return NextResponse.json({
      connection: saved.connection,
      link,
      connected: link.helpdeskLinked,
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
    return NextResponse.json({ error: 'Failed to save Zendesk connection.', code: 'zendesk_connection_save_failed' }, { status: 500 });
  }
}

export const GET = withRequestLogging('/api/settings/zendesk/connection', GETHandler);
export const POST = withRequestLogging('/api/settings/zendesk/connection', POSTHandler);
