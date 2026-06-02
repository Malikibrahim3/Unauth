import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { withRequestLogging } from '@/lib/log';
import { disableMerchantWooCommerceConnection } from '@/lib/commerce/woocommerce/settingsConnection';

async function POSTHandler() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  try {
    const connection = await disableMerchantWooCommerceConnection(service, ctx.merchantId);

    logAction({
      ctx,
      action: 'disable_woocommerce_connection',
      resourceType: 'commerce_store_connection',
      resourceId: connection.id,
      metadata: { store_key: connection.store_key },
    });

    return NextResponse.json({ connection });
  } catch (err) {
    if (err instanceof Error && err.message === 'woocommerce_connection_not_found') {
      return NextResponse.json({ error: 'WooCommerce connection not found' }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : 'Failed to disconnect WooCommerce';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withRequestLogging('/api/settings/woocommerce/disconnect', POSTHandler);
