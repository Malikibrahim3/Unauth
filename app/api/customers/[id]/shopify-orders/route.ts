import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;

  const profile = await fetchMerchantScopedCustomerProfile(service, ctx.merchantId, profileId, ctx.userId) as any;
  if (!profile) return NextResponse.json({ orders: [] });

  const { data: conn } = await service
    .from('merchant_shopify_connections' as any)
    .select('shop_domain')
    .eq('merchant_id', ctx.merchantId)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  const shopDomain = conn?.shop_domain as string | undefined;
  if (!shopDomain) return NextResponse.json({ orders: [] });

  const emails: string[] = Array.isArray(profile.emails) ? profile.emails : [];
  if (emails.length === 0) return NextResponse.json({ orders: [] });

  const { data: ids } = await service
    .from('merchant_identities' as any)
    .select('source_id,email')
    .eq('shop_domain', shopDomain)
    .eq('source', 'order')
    .in('email', emails);

  const orderIds = Array.from(new Set((ids ?? []).flatMap((r: any) => { const v = String(r.source_id); return v ? [v] : []; })));
  if (orderIds.length === 0) return NextResponse.json({ orders: [] });

  const { data: orders } = await service
    .from('shopify_order_signals' as any)
    .select('shopify_order_id,order_number,created_at_shopify,total_price,currency,financial_status,fulfillment_status,cancelled_at')
    .eq('shop_domain', shopDomain)
    .in('shopify_order_id', orderIds)
    .order('created_at_shopify', { ascending: false });

  return NextResponse.json({
    orders: (orders ?? []).map((o: any) => ({
      id: o.shopify_order_id,
      order_id: o.order_number ?? o.shopify_order_id,
      processed_at: o.created_at_shopify,
      order_value: o.total_price,
      currency: o.currency,
      status: o.cancelled_at ? 'cancelled' : (o.fulfillment_status ?? o.financial_status ?? 'unknown'),
      refund_claimed: false,
    })),
  });
}
