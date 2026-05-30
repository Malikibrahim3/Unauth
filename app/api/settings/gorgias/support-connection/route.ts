import { NextRequest, NextResponse } from 'next/server';
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
  updateMerchantGorgiasSupportConnectionMetadata,
} from '@/lib/support/gorgias/settingsConnection';
import {
  GORGIAS_CONNECT_CREDENTIALS_ERROR,
  GORGIAS_CONNECT_CREDENTIALS_ERROR_CODE,
} from '@/lib/support/gorgias/supportConnectionShared';

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
    const connection = await getMerchantGorgiasSupportConnection(service, ctx.merchantId);
    return NextResponse.json({ connection });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Gorgias connection';
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
    const message = err instanceof Error ? err.message : 'Failed to save Gorgias connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withRequestLogging('/api/settings/gorgias/support-connection', GETHandler);
export const POST = withRequestLogging('/api/settings/gorgias/support-connection', POSTHandler);
