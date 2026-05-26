import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createClaimSchema, upsertMerchantClaim } from '@/lib/claims/store';

async function getMerchantShops(serviceClient: any, merchantId: string) {
  const { data } = await serviceClient
    .from('merchant_shopify_connections' as any)
    .select('shop_domain,active')
    .eq('merchant_id', merchantId)
    .eq('active', true);
  return (data ?? []).map((r: any) => r.shop_domain as string);
}

async function merchantOwnsShopDomain(serviceClient: any, merchantId: string, shopDomain: string): Promise<boolean> {
  const shops = await getMerchantShops(serviceClient, merchantId);
  return shops.includes(shopDomain);
}

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied) return denied;

  const profileId = request.nextUrl.searchParams.get('profileId');
  const orderId = request.nextUrl.searchParams.get('orderId');
  const shops = await getMerchantShops(serviceClient, ctx.merchantId);

  let query = serviceClient
    .from('merchant_claims' as any)
    .select('id,shop_domain,shopify_order_id,claim_type,status,amount_at_risk,updated_at,merchant_case_outcomes(decision,outcome,updated_at)')
    .eq('merchant_id', ctx.merchantId)
    .order('updated_at', { ascending: false })
    .limit(25);

  if (profileId) query = query.eq('customer_id', profileId);
  if (orderId) query = query.eq('shopify_order_id', orderId);
  const { data: claims } = await query;

  return NextResponse.json({
    shops,
    activeShopDomain: shops[0] ?? null,
    claims: (claims ?? []).map((c: any) => ({
      id: c.id,
      shop_domain: c.shop_domain,
      shopify_order_id: c.shopify_order_id,
      claim_type: c.claim_type,
      status: c.status,
      amount_at_risk: c.amount_at_risk,
      updated_at: c.updated_at,
      latest_outcome: Array.isArray(c.merchant_case_outcomes) && c.merchant_case_outcomes.length > 0 ? c.merchant_case_outcomes[0] : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid claim payload' }, { status: 400 });

  if (!(await merchantOwnsShopDomain(serviceClient, ctx.merchantId, parsed.data.shop_domain))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const claim = await upsertMerchantClaim(serviceClient, {
      ...parsed.data,
      merchant_id: ctx.merchantId,
      actor_user_id: parsed.data.actor_user_id ?? user.id,
    });
    return NextResponse.json({ claim: { id: claim.id, shop_domain: claim.shop_domain, shopify_order_id: claim.shopify_order_id, claim_type: claim.claim_type, status: claim.status } });
  } catch {
    return NextResponse.json({ error: 'Failed to upsert claim' }, { status: 500 });
  }
}
