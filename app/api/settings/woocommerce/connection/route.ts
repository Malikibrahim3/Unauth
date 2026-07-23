import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import {
  createMerchantWooCommerceConnection,
  getMerchantWooCommerceConnection,
  updateMerchantWooCommerceConnection,
  woocommerceConnectionInputSchema,
} from '@/lib/commerce/woocommerce/settingsConnection';
import {
  WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR,
  WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR_CODE,
  WooCommerceCredentialsError,
} from '@/lib/commerce/woocommerce/woocommerceConnectionShared';
import { backfillWooCommerceOrders } from '@/lib/commerce/woocommerce/backfill';
import { normalizeWooCommerceStoreUrl } from '@/lib/commerce/woocommerce/normalizeStoreUrl';

function scheduleWooCommerceBackfill(
  service: ReturnType<typeof createServiceClient>,
  merchantId: string,
  storeUrl: string,
  storeKey: string,
  credentials: { consumer_key: string; consumer_secret: string },
) {
  after(async () => {
    try {
      await backfillWooCommerceOrders({
        supabase: service,
        storeUrl,
        storeKey,
        credentials,
      });
    } catch (err) {
      console.error('WooCommerce historical order backfill failed', {
        storeKey,
        merchantId,
        message: err instanceof Error ? err.message : 'unknown',
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
    const connection = await getMerchantWooCommerceConnection(service, ctx.merchantId);
    return NextResponse.json({ connection });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load WooCommerce connection';
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
  const mutationService = createServiceClient({
    audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip },
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = woocommerceConnectionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const existing = await getMerchantWooCommerceConnection(service, ctx.merchantId);

    if (existing?.status === 'active' && existing.credentials_configured) {
      const updated = await updateMerchantWooCommerceConnection(
        mutationService,
        ctx.merchantId,
        parsed.data,
      );

      const { store_url } = normalizeWooCommerceStoreUrl(parsed.data.store_url);
      scheduleWooCommerceBackfill(service, ctx.merchantId, store_url, updated.connection.store_key, {
        consumer_key: parsed.data.consumer_key,
        consumer_secret: parsed.data.consumer_secret,
      });

      return NextResponse.json({ connection: updated.connection });
    }

    const created = await createMerchantWooCommerceConnection(
      mutationService,
      ctx.merchantId,
      parsed.data,
    );

    const { store_url } = normalizeWooCommerceStoreUrl(parsed.data.store_url);
    const storeKey = created.connection.store_key;
    const credentials = {
      consumer_key: parsed.data.consumer_key,
      consumer_secret: parsed.data.consumer_secret,
    };
    scheduleWooCommerceBackfill(service, ctx.merchantId, store_url, storeKey, credentials);

    return NextResponse.json(created);
  } catch (err) {
    if (err instanceof WooCommerceCredentialsError) {
      return NextResponse.json(
        {
          error: WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR,
          code: WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR_CODE,
        },
        { status: 422 },
      );
    }
    if (err instanceof Error && err.message === 'woocommerce_connection_already_exists') {
      return NextResponse.json({ error: 'WooCommerce connection already exists' }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Failed to save WooCommerce connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withRequestLogging('/api/settings/woocommerce/connection', GETHandler);
export const POST = withRequestLogging('/api/settings/woocommerce/connection', POSTHandler);
