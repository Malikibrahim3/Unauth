import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { enforceEntitlement } from '@/lib/product/requireEntitlement';
import { label } from '@/lib/ui/labels';

type SourceCustomer = Record<string, unknown> & {
  id: string;
  external_id: string | null;
  source: string;
  email: string | null;
  phone: string | null;
  first_name?: string | null;
  last_name?: string | null;
  verified_email: boolean | null;
  updated_at: string;
};

const SOURCE_CUSTOMER_COLUMNS =
  'id,external_id,source,email,phone,first_name,last_name,verified_email,updated_at';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const gated = await enforceEntitlement(svc, ctx.merchantId, 'CUSTOMER_DOSSIER');
  if (gated) return gated;

  const { id } = await params;
  let canonical = (await svc
    .from(TABLES.MERCHANT_CUSTOMERS)
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .eq('id', id)
    .maybeSingle()).data as Record<string, unknown> | null;

  let sources: SourceCustomer[] = [];
  if (canonical) {
    const sourceResult = await svc
      .from(TABLES.SOURCE_CUSTOMERS)
      .select(SOURCE_CUSTOMER_COLUMNS)
      .eq('merchant_id', ctx.merchantId)
      .eq('merchant_customer_id', id);
    sources = (sourceResult.data as SourceCustomer[] | null) ?? [];
  } else {
    // The directory currently emits source-customer ids. Query only columns
    // that exist before and after the additive canonical-customer migration so
    // a not-yet-applied migration cannot turn a valid customer into a 404.
    const legacy = (await svc
      .from(TABLES.SOURCE_CUSTOMERS)
      .select(SOURCE_CUSTOMER_COLUMNS)
      .eq('merchant_id', ctx.merchantId)
      .eq('id', id)
      .maybeSingle()).data as SourceCustomer | null;

    if (legacy) {
      sources = [legacy];
      canonical = {
        id: legacy.id,
        display_name: [legacy.first_name, legacy.last_name].filter(Boolean).join(' '),
        email: legacy.email,
        updated_at: legacy.updated_at,
      };
    }
  }

  if (!canonical) {
    return NextResponse.json(
      { error: 'Customer not found', reason: 'stale_or_merged' },
      { status: 404 },
    );
  }

  const sourceIds = sources.map((source) => source.id);
  const orderRows = sourceIds.length
    ? ((await svc
        .from(TABLES.SOURCE_ORDERS)
        .select('id,order_number,total_price,currency,updated_at')
        .eq('merchant_id', ctx.merchantId)
        .in('source_customer_id', sourceIds)
        .order('updated_at', { ascending: false })
        .limit(10000)).data as Record<string, unknown>[] | null) ?? []
    : [];

  const orderIds = orderRows.map((order) => String(order.id));
  const cases = orderIds.length
    ? ((await svc
        .from(TABLES.MERCHANT_CLAIMS)
        .select('id,status,claim_type,amount_at_risk,currency,updated_at')
        .eq('merchant_id', ctx.merchantId)
        .in('source_order_id', orderIds.slice(0, 2000))
        .order('updated_at', { ascending: false })
        .limit(20)).data as Record<string, unknown>[] | null) ?? []
    : [];

  const totals = new Map<string, { orders: number; value: number }>();
  let unavailableCurrencyOrders = 0;
  for (const order of orderRows) {
    const currency = normaliseCurrencyOrNull(order.currency);
    if (!currency) {
      unavailableCurrencyOrders += 1;
      continue;
    }
    const current = totals.get(currency) ?? { orders: 0, value: 0 };
    current.orders += 1;
    current.value += Number(order.total_price ?? 0);
    totals.set(currency, current);
  }

  const asOf =
    sources
      .map((source) => source.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? String(canonical.updated_at ?? '');
  const firstSeen = orderRows
    .map((order) => String(order.updated_at ?? ''))
    .filter(Boolean)
    .sort()
    .at(0) ?? sources.map((source) => source.updated_at).filter(Boolean).sort().at(0) ?? null;
  const openCases = cases.filter((claim) =>
    ['new', 'open', 'pending', 'evidence_needed', 'awaiting_customer_evidence', 'awaiting_carrier_response', 'ready_for_decision', 'manual_review', 'escalated'].includes(String(claim.status)),
  );
  const refundCases = cases.filter((claim) =>
    ['refund_request', 'resolved_refunded'].includes(String(claim.claim_type)) || String(claim.status) === 'resolved_refunded',
  ).length;

  return NextResponse.json({
    version: 2,
    customer: {
      id: String(canonical.id),
      name: String(canonical.display_name || 'Unnamed customer'),
      email: canonical.email ? String(canonical.email) : null,
      asOf: asOf || null,
      firstSeen,
      stats: {
        orders: orderRows.length,
        payoutCases: cases.length,
        refundRate: orderRows.length > 0 ? Math.round((refundCases / orderRows.length) * 100) : 0,
        chargebacks: cases.filter((claim) => String(claim.claim_type) === 'chargeback').length,
      },
      sources: sources.map((source) => ({
        provider: source.source,
        externalId: source.external_id,
        email: source.email,
        phone: source.phone,
        verified: source.verified_email,
        asOf: source.updated_at,
      })),
      totalsByCurrency: [...totals].map(([currency, value]) => ({ currency, ...value })),
      unavailableCurrencyOrders,
      attention: openCases
        .map((claim) => ({
          text: `Open ${label('claimType', String(claim.claim_type || 'other'))} case`,
          href: `/claims/${claim.id}`,
        })),
      openCases: openCases.map((claim) => ({
        id: String(claim.id),
        reference: label('claimType', String(claim.claim_type || 'other')),
        state: String(claim.status),
        amount: claim.amount_at_risk == null ? null : Number(claim.amount_at_risk),
        currency: normaliseCurrencyOrNull(claim.currency),
        href: `/claims/${claim.id}`,
      })),
      recent: orderRows.slice(0, 5).map((order) => ({
        type: 'order',
        reference: String(order.order_number || order.id),
        amount: order.total_price == null ? null : Number(order.total_price),
        currency: normaliseCurrencyOrNull(order.currency),
        at: String(order.updated_at),
        href: `/orders/${order.id}`,
      })),
    },
  });
}
