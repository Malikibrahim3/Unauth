import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';
import { listSupportCasesForCustomerProfile } from '@/lib/support/intake/supportCaseReadModel';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await context.params;
  const profileId = params.id;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_CUSTOMERS
  );
  if (denied || !ctx?.merchantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const profile = await fetchMerchantScopedCustomerProfile(
    serviceClient,
    ctx.merchantId,
    profileId
  );
  if (!profile) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const cases = await listSupportCasesForCustomerProfile(
    serviceClient,
    ctx.merchantId,
    profileId
  );

  return NextResponse.json({ support_cases: cases });
}
