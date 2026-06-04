import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';
import { backfillBigCommerceOrders } from '@/lib/commerce/bigcommerce/backfill';
import {
  getMerchantBigCommerceConnection,
  loadBigCommerceCredentialsForStore,
} from '@/lib/commerce/bigcommerce/connectionSettings';
import { loadBigCommerceAccessToken } from '@/lib/commerce/bigcommerce/bigcommerceApi';

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

  const connection = await getMerchantBigCommerceConnection(service, ctx.merchantId);
  if (connection?.status !== 'active' || !connection.store_key || !connection.credentials_configured) {
    return NextResponse.json({ error: 'BigCommerce is not connected' }, { status: 400 });
  }

  const credentialRow = await loadBigCommerceCredentialsForStore(service, connection.store_key);
  if (!credentialRow) {
    return NextResponse.json({ error: 'BigCommerce credentials missing' }, { status: 400 });
  }

  try {
    const accessToken = await loadBigCommerceAccessToken(credentialRow.credentials_encrypted);
    const result = await backfillBigCommerceOrders({
      supabase: service,
      storeHash: connection.store_key,
      accessToken,
    });
    return NextResponse.json({ ok: true, store: connection.store_key, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bigcommerce_backfill_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withRequestLogging('/api/settings/bigcommerce/sync', POSTHandler);
