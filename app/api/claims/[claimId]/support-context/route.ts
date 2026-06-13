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
    .from('claims')
    .select('id, merchant_id, source_order_id')
    .eq('id', claimId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();

  if (error || !claim) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let externalOrderId: string | null = null;
  let orderNumber: string | null = null;
  if (claim.source_order_id) {
    const { data: order } = await serviceClient
      .from('source_orders')
      .select('external_id, order_number')
      .eq('id', claim.source_order_id)
      .eq('merchant_id', ctx.merchantId)
      .maybeSingle();
    externalOrderId = order?.external_id ?? null;
    orderNumber = order?.order_number ?? null;
  }

  const supportCases = await listSupportCasesForClaimContext(serviceClient, ctx.merchantId, {
    merchantClaimId: claim.id,
    shopifyOrderId: externalOrderId,
    orderRef: orderNumber,
    shopDomain: null,
  });

  return NextResponse.json({ support_cases: supportCases });
}
