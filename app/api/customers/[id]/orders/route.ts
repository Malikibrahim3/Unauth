import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/log';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { resolveMerchantCustomerId } from '@/lib/customers/merchantCustomerHistory';

export const dynamic = 'force-dynamic';

async function GETHandler(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: customerId } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;

  const { data: customer } = await service
    .from(TABLES.SOURCE_CUSTOMERS)
    .select('id, merchant_customer_id')
    .eq('id', customerId)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  const merchantCustomerId = await resolveMerchantCustomerId(service, ctx.merchantId, customerId);
  const { data: canonical } = !customer
    ? await service
      .from(TABLES.MERCHANT_CUSTOMERS)
      .select('id')
      .eq('merchant_id', ctx.merchantId)
      .eq('id', customerId)
      .maybeSingle()
    : { data: null };
  if (!customer && !canonical) return NextResponse.json({ orders: [] });

  let orderQuery = service
    .from(TABLES.SOURCE_ORDERS)
    .select('id, external_id, order_number, placed_at, total_price')
    .eq('merchant_id', ctx.merchantId);
  if (merchantCustomerId || canonical?.id) {
    orderQuery = orderQuery.eq('merchant_customer_id', merchantCustomerId ?? customerId);
  } else {
    orderQuery = orderQuery.eq('source_customer_id', customerId);
  }
  const { data: orderData, error: orderError } = await orderQuery
    .order('placed_at', { ascending: true })
    .limit(2000);
  if (orderError) return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });

  const orders = (orderData ?? []) as Array<{
    id: string;
    external_id: string;
    order_number: string | null;
    placed_at: string | null;
    total_price: number | string | null;
  }>;
  const orderIds = orders.map((order) => order.id);
  const { data: claimData } = orderIds.length > 0
    ? await service
      .from(TABLES.MERCHANT_CLAIMS)
      .select('source_order_id')
      .eq('merchant_id', ctx.merchantId)
      .in('source_order_id', orderIds)
    : { data: [] };
  const claimedOrderIds = new Set(
    ((claimData ?? []) as Array<{ source_order_id: string | null }>).flatMap((claim) =>
      claim.source_order_id ? [claim.source_order_id] : [],
    ),
  );

  if (merchantCustomerId || canonical?.id) {
    const { data: directClaims } = await service
      .from(TABLES.MERCHANT_CLAIMS)
      .select('source_order_id')
      .eq('merchant_id', ctx.merchantId)
      .eq('merchant_customer_id', merchantCustomerId ?? customerId)
      .in('source_order_id', orderIds.length ? orderIds : ['00000000-0000-0000-0000-000000000000']);
    for (const claim of (directClaims ?? []) as Array<{ source_order_id: string | null }>) {
      if (claim.source_order_id) claimedOrderIds.add(claim.source_order_id);
    }
  }

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      order_id: order.order_number ?? order.external_id,
      processed_at: order.placed_at ?? new Date(0).toISOString(),
      order_value: order.total_price == null ? null : Number(order.total_price),
      refund_claimed: claimedOrderIds.has(order.id),
    })),
  });
}

export const GET = withRequestLogging('/api/customers/[id]/orders', GETHandler);
