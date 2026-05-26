import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createClaimSchema, upsertMerchantClaim } from '@/lib/claims/store';

async function merchantOwnsShopDomain(serviceClient: any, merchantId: string, shopDomain: string): Promise<boolean> {
  const { data } = await serviceClient
    .from('merchant_shopify_connections' as any)
    .select('merchant_id')
    .eq('merchant_id', merchantId)
    .eq('shop_domain', shopDomain)
    .eq('active', true)
    .maybeSingle();
  return !!data;
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
    return NextResponse.json({ error: 'Invalid claim payload' }, { status: 400 });
  }

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
