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

  const pageSize = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10)));
  let query = serviceClient
    .from('merchant_claims' as any)
    .select('id,customer_id,shop_domain,shopify_order_id,order_ref,order_source,claim_type,status,amount_at_risk,currency,updated_at,merchant_case_outcomes(decision,outcome,updated_at)')
    .eq('merchant_id', ctx.merchantId)
    .order('updated_at', { ascending: false })
    .limit(pageSize);

  if (profileId) query = query.eq('customer_id', profileId);
  if (orderId) query = query.eq('shopify_order_id', orderId);
  const { data: claims } = await query;

  return NextResponse.json({
    shops,
    activeShopDomain: shops[0] ?? null,
    claims: (claims ?? []).map((c: any) => ({
      id: c.id,
      customer_id: c.customer_id,
      shop_domain: c.shop_domain,
      shopify_order_id: c.shopify_order_id,
      order_ref: c.order_ref,
      order_source: c.order_source,
      claim_type: c.claim_type,
      status: c.status,
      amount_at_risk: c.amount_at_risk,
      currency: c.currency,
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
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const msg = firstIssue?.message === 'Select an order before saving the claim.'
      ? firstIssue.message
      : 'Invalid claim payload';
    const status = firstIssue?.message === 'Select an order before saving the claim.' ? 422 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  // Verify the customer profile belongs to this merchant.
  // CSV customers (no shop_domain, order_ref supplied instead of shopify_order_id) are fully
  // supported — the schema requires only one of shopify_order_id | order_ref | audit_transaction_id,
  // and this ownership check is profile-based, not Shopify-connection-based. Verified 2026-05-27.
  if (parsed.data.customer_id) {
    const { data: profile } = await serviceClient
      .from('customer_profiles' as any)
      .select('id')
      .eq('id', parsed.data.customer_id)
      .eq('merchant_id', ctx.merchantId)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // If a shop_domain is supplied, additionally verify ownership of it.
  if (parsed.data.shop_domain) {
    if (!(await merchantOwnsShopDomain(serviceClient, ctx.merchantId, parsed.data.shop_domain))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const claim = await upsertMerchantClaim(serviceClient, {
      ...parsed.data,
      merchant_id: ctx.merchantId,
      actor_user_id: parsed.data.actor_user_id ?? user.id,
    });
    return NextResponse.json({ claim: { id: claim.id, shop_domain: claim.shop_domain, shopify_order_id: claim.shopify_order_id, order_ref: claim.order_ref, order_source: claim.order_source, claim_type: claim.claim_type, status: claim.status } });
  } catch {
    return NextResponse.json({ error: 'Failed to upsert claim' }, { status: 500 });
  }
}
