import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { fetchMerchantScopedSourceCustomer } from '@/lib/supabase/merchantHelpers';
import { resolveMerchantCustomerId } from '@/lib/customers/merchantCustomerHistory';
import {
  listSupportCasesForCustomerProfile,
  listSupportCasesForMerchantCustomer,
} from '@/lib/support/intake/supportCaseReadModel';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

  const merchantCustomerId = await resolveMerchantCustomerId(
    serviceClient,
    ctx.merchantId,
    profileId,
  );
  let cases;
  if (merchantCustomerId) {
    cases = await listSupportCasesForMerchantCustomer(
      serviceClient,
      ctx.merchantId,
      merchantCustomerId,
    );
  } else {
    const customer = await fetchMerchantScopedSourceCustomer(
      serviceClient,
      ctx.merchantId,
      profileId,
    );
    if (!customer) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    cases = await listSupportCasesForCustomerProfile(
      serviceClient,
      ctx.merchantId,
      customer.id,
    );
  }

  return NextResponse.json({ support_cases: cases });
}
