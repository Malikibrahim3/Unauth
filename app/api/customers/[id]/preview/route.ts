import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { enforceEntitlement } from '@/lib/product/requireEntitlement';
import { label } from '@/lib/ui/labels';
import { isActiveClaimStatus } from '@/lib/claims/sla';
import { loadMerchantCustomerHistory } from '@/lib/customers/merchantCustomerHistory';
import { deriveSourceLink, loadSourceLinkContext } from '@/lib/relationships/sourceLinking';

type SourceCustomer = Record<string, unknown> & {
  id: string;
  external_id: string | null;
  source: string;
  email: string | null;
  phone: string | null;
  first_name?: string | null;
  last_name?: string | null;
  verified_email: boolean | null;
  orders_count?: number | null;
  merchant_customer_id?: string | null;
  updated_at: string;
};

const SOURCE_CUSTOMER_COLUMNS =
  'id,external_id,source,email,phone,first_name,last_name,verified_email,orders_count,merchant_customer_id,updated_at';

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
      .eq('merchant_customer_id', String(canonical.superseded_by ?? canonical.id));
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
      const linkedCanonicalId = legacy.merchant_customer_id ?? legacy.id;
      canonical = {
        id: linkedCanonicalId,
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

  const activeCanonicalId = canonical?.superseded_by
    ? String(canonical.superseded_by)
    : String(canonical?.id ?? id);
  const merchantHistory = await loadMerchantCustomerHistory(svc, ctx.merchantId, activeCanonicalId);

  const sourceIds = sources.map((source) => source.id);
  let orderRows: Record<string, unknown>[] = [];
  try {
    const direct = await svc
      .from(TABLES.SOURCE_ORDERS)
      .select('id,external_id,order_number,total_price,currency,placed_at,updated_at,merchant_customer_id,source,connection_id,source_account_id')
      .eq('merchant_id', ctx.merchantId)
      .eq('merchant_customer_id', activeCanonicalId)
      .order('updated_at', { ascending: false })
      .limit(10000);
    if (!direct.error) orderRows = (direct.data as Record<string, unknown>[] | null) ?? [];
  } catch {
    // Fallback below supports deployments before the additive order column.
  }
  if (orderRows.length === 0 && sourceIds.length > 0) {
    const legacy = await svc
      .from(TABLES.SOURCE_ORDERS)
      .select('id,external_id,order_number,total_price,currency,placed_at,updated_at,source,connection_id,source_account_id')
      .eq('merchant_id', ctx.merchantId)
      .in('source_customer_id', sourceIds)
      .order('updated_at', { ascending: false })
      .limit(10000);
    orderRows = (legacy.data as Record<string, unknown>[] | null) ?? [];
  }

  const orderIds = orderRows.map((order) => String(order.id));
  let cases: Record<string, unknown>[] = [];
  try {
    const direct = await svc
      .from(TABLES.MERCHANT_CLAIMS)
      .select('id,status,claim_type,source_order_id,amount_at_risk,currency,updated_at,merchant_customer_id')
      .eq('merchant_id', ctx.merchantId)
      .eq('merchant_customer_id', activeCanonicalId)
      .order('updated_at', { ascending: false })
      .limit(2000);
    if (!direct.error) cases = (direct.data as Record<string, unknown>[] | null) ?? [];
  } catch {
    // Fallback below supports deployments before the additive case column.
  }
  if (orderIds.length > 0) {
    const legacy = await svc
      .from(TABLES.MERCHANT_CLAIMS)
      .select('id,status,claim_type,source_order_id,amount_at_risk,currency,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .in('source_order_id', orderIds.slice(0, 2000))
      .order('updated_at', { ascending: false })
      .limit(2000);
    const seen = new Set(cases.map((claim) => String(claim.id)));
    for (const claim of (legacy.data as Record<string, unknown>[] | null) ?? []) {
      if (!seen.has(String(claim.id))) cases.push(claim);
    }
  }

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

  // Match the customer profile and list, which treat the store's denormalised
  // orders_count as the lifetime order total when it exceeds the detailed order
  // rows ingested so far (a seeded/synced customer can have more lifetime orders
  // than we hold line-item rows for). Counting only ingested rows here made the
  // drawer report fewer orders and a higher case rate than the profile.
  const denormOrderCount = sources.reduce(
    (sum, source) => sum + (Number(source.orders_count) || 0),
    0,
  );
  const merchantOrderCount = Math.max(orderRows.length, denormOrderCount);
  // Single-currency stores: reflect the lifetime count in the value breakdown so
  // the shown average (value ÷ orders) matches the profile.
  if (totals.size === 1) {
    for (const bucket of totals.values()) {
      bucket.orders = Math.max(bucket.orders, merchantOrderCount);
    }
  }

  const asOf =
    sources
      .map((source) => source.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? String(canonical.updated_at ?? '');
  const firstSeen = orderRows
    .map((order) => String(order.placed_at ?? order.updated_at ?? ''))
    .filter(Boolean)
    .sort()
    .at(0) ?? sources.map((source) => source.updated_at).filter(Boolean).sort().at(0) ?? null;
  const openCases = cases.filter((claim) => isActiveClaimStatus(String(claim.status)));
  const ordersWithCases = new Set(
    cases.map((claim) => String(claim.source_order_id ?? '')).filter(Boolean),
  ).size;
  const latestOrderAt = orderRows
    .map((order) => String(order.placed_at ?? order.updated_at ?? ''))
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  const openExposure = new Map<string, number>();
  for (const claim of openCases) {
    const currency = normaliseCurrencyOrNull(claim.currency);
    const value = Number(claim.amount_at_risk ?? 0);
    if (currency && Number.isFinite(value)) {
      openExposure.set(currency, (openExposure.get(currency) ?? 0) + value);
    }
  }
  const claimsByOrder = new Map<string, Record<string, unknown>[]>();
  for (const claim of cases) {
    const orderId = String(claim.source_order_id ?? '');
    if (!orderId) continue;
    claimsByOrder.set(orderId, [...(claimsByOrder.get(orderId) ?? []), claim]);
  }

  const recentOrderIds = orderRows.slice(0, 6).map((order) => String(order.id));
  let lineRows: Record<string, unknown>[] = [];
  if (recentOrderIds.length > 0) {
    const { data } = await svc
      .from(TABLES.SOURCE_ORDER_LINES)
      .select('source_order_id,title,quantity,total_minor,currency')
      .eq('merchant_id', ctx.merchantId)
      .in('source_order_id', recentOrderIds);
    lineRows = (data as Record<string, unknown>[] | null) ?? [];
  }
  const linesByOrder = new Map<string, Record<string, unknown>[]>();
  for (const line of lineRows) {
    const orderId = String(line.source_order_id ?? '');
    if (!orderId) continue;
    linesByOrder.set(orderId, [...(linesByOrder.get(orderId) ?? []), line]);
  }

  let shipmentRows: Record<string, unknown>[] = [];
  if (recentOrderIds.length > 0) {
    const { data } = await svc
      .from(TABLES.SOURCE_SHIPMENTS)
      .select('source_order_id,external_id,source_account_id,source_record_id,carrier,status,tracking_number')
      .eq('merchant_id', ctx.merchantId)
      .in('source_order_id', recentOrderIds);
    shipmentRows = (data as Record<string, unknown>[] | null) ?? [];
  }
  const shipmentByOrder = new Map<string, Record<string, unknown>>();
  for (const shipment of shipmentRows) {
    const orderId = String(shipment.source_order_id ?? '');
    if (orderId && !shipmentByOrder.has(orderId)) shipmentByOrder.set(orderId, shipment);
  }
  const sourceLinkContext = await loadSourceLinkContext(svc, ctx.merchantId);

  let signalRows: Record<string, unknown>[] = [];
  if (activeCanonicalId) {
    const { data } = await svc
      .from(TABLES.MERCHANT_CUSTOMER_SIGNALS)
      .select('identifier_type,identifier_hash,seen_count')
      .eq('merchant_id', ctx.merchantId)
      .eq('merchant_customer_id', activeCanonicalId);
    signalRows = (data as Record<string, unknown>[] | null) ?? [];
  }
  const signalCounts = new Map<string, Set<string>>();
  for (const row of signalRows) {
    const type = String(row.identifier_type ?? '');
    if (!type) continue;
    const set = signalCounts.get(type) ?? new Set<string>();
    set.add(String(row.identifier_hash ?? ''));
    signalCounts.set(type, set);
  }
  const identitySignalCounts = [...signalCounts.entries()]
    .map(([type, hashes]) => ({ type, distinctCount: hashes.size }))
    .sort((a, b) => b.distinctCount - a.distinctCount);

  return NextResponse.json({
    version: 2,
    customer: {
      id: String(canonical.id),
      name: String(canonical.display_name || 'Unnamed customer'),
      email: canonical.email ? String(canonical.email) : null,
      asOf: asOf || null,
      firstSeen,
      lastOrderAt: latestOrderAt,
      stats: {
        orders: merchantOrderCount,
        payoutCases: cases.length,
        caseRate: merchantOrderCount > 0 ? Math.round((ordersWithCases / merchantOrderCount) * 100) : 0,
        chargebacks: cases.filter((claim) => String(claim.claim_type) === 'chargeback').length,
        refundRequests365d: merchantHistory.refundRequests365d,
        completedRefunds365d: merchantHistory.completedRefunds365d,
        possibleMatchCount: merchantHistory.possibleMatches.length,
      },
      identitySignalCounts,
      possibleMatches: merchantHistory.possibleMatches.slice(0, 5).map((match) => ({
        candidateId: match.candidateId,
        displayName: match.displayName,
        email: match.email,
        confidence: match.confidence,
        matchedTypes: match.matchedTypes,
      })),
      sources: sources.map((source) => ({
        provider: source.source,
        externalId: source.external_id,
        email: source.email,
        phone: source.phone,
        verified: source.verified_email,
        asOf: source.updated_at,
      })),
      totalsByCurrency: [...totals].map(([currency, value]) => ({ currency, ...value })),
      openExposureByCurrency: [...openExposure].map(([currency, value]) => ({ currency, value })),
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
      recent: orderRows.slice(0, 6).map((order) => {
        const orderCases = claimsByOrder.get(String(order.id)) ?? [];
        const latestCase = orderCases[0];
        const orderLines = linesByOrder.get(String(order.id)) ?? [];
        const shipment = shipmentByOrder.get(String(order.id));
        const orderLink = deriveSourceLink({
          context: sourceLinkContext,
          entityType: 'order',
          row: order,
          relatedShipmentExternalId: shipment ? String(shipment.external_id ?? '') || null : null,
        });
        const shipmentLink = shipment
          ? deriveSourceLink({
              context: sourceLinkContext,
              entityType: 'shipment',
              row: shipment,
              parentOrder: order,
            })
          : null;
        return ({
        type: 'order',
        reference: String(order.order_number || order.id),
        amount: order.total_price == null ? null : Number(order.total_price),
        currency: normaliseCurrencyOrNull(order.currency),
        at: String(order.placed_at ?? order.updated_at),
        href: `/orders/${order.id}`,
        externalHref: orderLink?.sourceUrl ?? null,
        externalSource: orderLink?.sourceSystem ?? null,
        caseCount: orderCases.length,
        caseType: latestCase ? label('claimType', String(latestCase.claim_type || 'other')) : null,
        caseState: latestCase ? String(latestCase.status) : null,
        lineItems: orderLines
          .filter((line) => line.title)
          .map((line) => ({
            title: String(line.title),
            quantity: line.quantity == null ? null : Number(line.quantity),
          })),
        shipmentStatus: shipment ? String(shipment.status ?? '') || null : null,
        shipmentCarrier: shipment ? (shipment.carrier ? String(shipment.carrier) : null) : null,
        shipmentHref: shipmentLink?.sourceUrl ?? null,
        shipmentSource: shipmentLink?.sourceSystem ?? null,
      })}),
    },
  });
}
