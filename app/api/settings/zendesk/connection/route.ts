import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { withRequestLogging } from '@/lib/log';

async function GETHandler() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;

  const { data, error } = await service
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('id')
    .eq('merchant_id', ctx.merchantId)
    .eq('provider', 'zendesk')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connected: !!data });
}

export const GET = withRequestLogging('/api/settings/zendesk/connection', GETHandler);
