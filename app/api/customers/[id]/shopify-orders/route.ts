import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';
import { normaliseEmail } from '@/lib/identity/normalise';

type SourceOrderRow = {
  external_id: string;
  order_number: string | null;
  placed_at: string | null;
  ingested_at: string | null;
  total_price: number | null;
  currency: string | null;
  financial_status: string | null;
  fulfillment_state: string | null;
  cancelled_at: string | null;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;

  const profile = await fetchMerchantScopedCustomerProfile(service, ctx.merchantId, profileId, ctx.userId);
  if (!profile) return NextResponse.json({ orders: [] });

  // v2: a merchant's own Shopify orders live in the merchant-scoped
  // `source_orders` table (source='shopify'); match by the profile's emails.
  const rawEmails = Array.isArray((profile as { emails?: unknown }).emails)
    ? ((profile as { emails: unknown[] }).emails)
    : [];
  const emails = Array.from(
    new Set(
      rawEmails
        .flatMap((value) => {
          const normalised = normaliseEmail(typeof value === 'string' ? value : null);
          return normalised ? [normalised] : [];
        }),
    ),
  );
  if (emails.length === 0) return NextResponse.json({ orders: [] });

  // Only surface live orders when a Shopify connection exists for the merchant.
  const { data: conn } = await service
    .from('store_connections')
    .select('id')
    .eq('merchant_id', ctx.merchantId)
    .eq('platform', 'shopify')
    .neq('status', 'revoked')
    .limit(1)
    .maybeSingle();
  if (!conn) return NextResponse.json({ orders: [] });

  const { data: orders } = await service
    .from('source_orders')
    .select('external_id, order_number, placed_at, ingested_at, total_price, currency, financial_status, fulfillment_state, cancelled_at')
    .eq('merchant_id', ctx.merchantId)
    .eq('source', 'shopify')
    .in('email', emails)
    .order('placed_at', { ascending: false, nullsFirst: false });

  const rows = (orders ?? []) as SourceOrderRow[];

  return NextResponse.json({
    orders: rows.map((o) => ({
      id: o.external_id,
      order_id: o.order_number ?? o.external_id,
      processed_at: o.placed_at ?? o.ingested_at,
      order_value: o.total_price,
      currency: o.currency,
      status: o.cancelled_at
        ? 'cancelled'
        : (o.fulfillment_state ?? o.financial_status ?? 'unknown'),
      refund_claimed: o.financial_status === 'refunded' || o.financial_status === 'partially_refunded',
    })),
  });
}
