import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';
import { decryptWooCommerceCredentials } from '@/lib/commerce/credentialCrypto';
import { backfillWooCommerceOrders } from '@/lib/commerce/woocommerce/backfill';
import {
  getMerchantWooCommerceConnection,
  loadWooCommerceCredentialsForStore,
} from '@/lib/commerce/woocommerce/settingsConnection';

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

  const connection = await getMerchantWooCommerceConnection(service, ctx.merchantId);
  if (!connection?.status || connection.status !== 'active' || !connection.store_key) {
    return NextResponse.json({ error: 'WooCommerce is not connected' }, { status: 400 });
  }

  const credentialRow = await loadWooCommerceCredentialsForStore(service, connection.store_key);
  if (!credentialRow?.store_url) {
    return NextResponse.json({ error: 'WooCommerce credentials missing' }, { status: 400 });
  }

  try {
    const credentials = decryptWooCommerceCredentials(credentialRow.credentials_encrypted);
    const result = await backfillWooCommerceOrders({
      supabase: service,
      storeUrl: credentialRow.store_url,
      storeKey: connection.store_key,
      credentials,
    });
    return NextResponse.json({ ok: true, store: connection.store_key, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'woocommerce_backfill_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withRequestLogging('/api/settings/woocommerce/sync', POSTHandler);
