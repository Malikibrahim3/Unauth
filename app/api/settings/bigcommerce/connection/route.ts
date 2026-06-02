import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';
import { getMerchantBigCommerceConnection } from '@/lib/commerce/bigcommerce/connectionSettings';

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
    const connection = await getMerchantBigCommerceConnection(service, ctx.merchantId);
    return NextResponse.json({ connection });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load BigCommerce connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withRequestLogging('/api/settings/bigcommerce/connection', GETHandler);
