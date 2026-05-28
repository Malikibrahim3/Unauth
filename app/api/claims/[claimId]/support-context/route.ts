import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { listSupportCasesForClaimContext } from '@/lib/support/intake/supportCaseReadModel';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ claimId: string }> | { claimId: string } }
) {
  const params = await context.params;
  const claimId = params.claimId;

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
    PERMISSIONS.SUBMIT_FRAUD_FEEDBACK
  );
  if (denied || !ctx?.merchantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: claim, error } = await serviceClient
    .from('merchant_claims')
    .select('id, merchant_id, shopify_order_id, shop_domain')
    .eq('id', claimId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();

  if (error || !claim) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const supportCases = await listSupportCasesForClaimContext(serviceClient, ctx.merchantId, {
    merchantClaimId: claim.id,
    shopifyOrderId: claim.shopify_order_id,
    orderRef: null,
    shopDomain: claim.shop_domain,
  });

  return NextResponse.json({ support_cases: supportCases });
}
