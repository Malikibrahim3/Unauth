import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getStoredIntegrationViews } from '@/lib/integrations/auth';
import { integrationProvidersByCategory } from '@/lib/integrations/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;

  const providers = await getStoredIntegrationViews(serviceClient, ctx.merchantId);
  return NextResponse.json({
    providers,
    groups: integrationProvidersByCategory(),
  });
}
