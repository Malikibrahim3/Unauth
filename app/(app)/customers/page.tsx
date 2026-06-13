// TODO(product-gating): require CUSTOMER_SEARCH entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { getMerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import { resolveMerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { redirect } from 'next/navigation';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';
import { isOrderReferenceSearchTerm, orderReferenceIlike } from '@/lib/customers/orderSearch';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail } from '@/lib/identity/normalise';
import { lookupIdentityGradesByEmailHash } from '@/lib/customers/identityNetwork';
import type { IdentityGradeBadge } from '@/lib/customers/identityNetwork';
import { CustomersOverviewPageView } from '@/app/(app)/customers/CustomersOverviewPageView';
import { resolveCustomerActions } from '@/app/(app)/customers/customersOverviewPageUtils';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

const OPEN_CLAIM_STATUSES = ['pending', 'open', 'escalated'] as const;
const CHARGEBACK_CLAIM_TYPE = 'chargeback';

type SourceCustomerRow = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  orders_count: number | null;
  total_spent: number | string | null;
  account_created_at: string | null;
  created_at: string;
  updated_at: string;
};

type OrderAggRow = {
  id: string;
  source_customer_id: string | null;
  placed_at: string | null;
};

type ClaimAggRow = {
  id: string;
  claim_type: string;
  status: string;
  source_order_id: string | null;
};

function displayNames(row: SourceCustomerRow): string[] {
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return name ? [name] : [];
}

export default async function CustomersOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>> | Record<string, string | undefined>;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return redirect(await resolveDefaultAppPath(svc, user.id));

  // Run connection state and search-param resolution in parallel — neither blocks the other.
  const [[connectionState, dataPresence], sp] = await Promise.all([
    Promise.all([
      getConnectionState(svc, ctx.merchantId),
      getMerchantDataPresence(svc, ctx.merchantId, user.id),
    ]),
    Promise.resolve(searchParams).then((p) => p ?? {}),
  ]);
  const setupState = resolveMerchantSetupState(connectionState, dataPresence);

  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const requestedPageSize = parseInt(sp.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const PAGE_SIZE = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * PAGE_SIZE;

  // Basic
  const q               = sp.q?.trim() || sp.email?.trim() || '';
  const riskFilter      = sp.risk ?? '';
  const hasRefunds      = sp.hasRefunds === '1';
  const hasChargebacks  = sp.hasChargebacks === '1';
  /** Legacy query param — ignored (watchlist filter retired). */
  void (sp.watchlisted === '1');
  const openClaimsOnly = sp.openClaims === '1';
  const sort            = sp.sort ?? 'risk';

  // Investigation status (merchant_identity_state.investigation_status)
  const statusFilter = sp.status?.trim() ?? '';

  // -------------------------------------------------------------------------
  // Customer ID pre-filters (search / claims-derived filters).
  //
  // The merchant's own customer list comes from layer-1 source_customers /
  // source_orders / claims. Identity grade is a per-row enrichment (below) —
  // never a base-table join, since identities are network-level.
  // -------------------------------------------------------------------------
  const isOrderReferenceSearch = isOrderReferenceSearchTerm(q);
  let restrictToCustomerIds: string[] | null = null;

  if (isOrderReferenceSearch) {
    const ilike = orderReferenceIlike(q);
    const { data: orderRows } = await svc
      .from('source_orders')
      .select('source_customer_id')
      .eq('merchant_id', ctx.merchantId)
      .or(`external_id.ilike.${ilike},order_number.ilike.${ilike}`)
      .not('source_customer_id', 'is', null)
      .limit(200) as unknown as { data: Array<{ source_customer_id: string | null }> | null };
    restrictToCustomerIds = Array.from(
      new Set((orderRows ?? []).flatMap((r) => (r.source_customer_id ? [r.source_customer_id] : []))),
    );
  }

  const claimFiltersActive = hasRefunds || hasChargebacks || openClaimsOnly;
  if (claimFiltersActive) {
    let claimQuery = svc
      .from('claims')
      .select('source_order_id, claim_type, status, source_orders!inner(source_customer_id)')
      .eq('merchant_id', ctx.merchantId)
      .not('source_order_id', 'is', null);
    if (hasChargebacks && !hasRefunds) claimQuery = claimQuery.eq('claim_type', CHARGEBACK_CLAIM_TYPE);
    if (openClaimsOnly) claimQuery = claimQuery.in('status', [...OPEN_CLAIM_STATUSES]);
    const { data: claimRows } = await claimQuery.limit(2000) as unknown as {
      data: Array<{ source_orders: { source_customer_id: string | null } | null }> | null;
    };
    const claimCustomerIds = Array.from(
      new Set(
        (claimRows ?? []).flatMap((r) =>
          r.source_orders?.source_customer_id ? [r.source_orders.source_customer_id] : [],
        ),
      ),
    );
    restrictToCustomerIds = restrictToCustomerIds
      ? restrictToCustomerIds.filter((id) => claimCustomerIds.includes(id))
      : claimCustomerIds;
  }

  // -------------------------------------------------------------------------
  // Base query: the merchant's own customers (layer-1, merchant-scoped).
  // -------------------------------------------------------------------------
  let query = svc
    .from('source_customers')
    .select(
      'id, email, phone, first_name, last_name, orders_count, total_spent, account_created_at, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('merchant_id', ctx.merchantId);

  if (q.length >= 2 && !isOrderReferenceSearch) {
    const safeLike = `%${escapePostgrestFilterValue(q)}%`;
    query = query.or(`email.ilike.${safeLike},first_name.ilike.${safeLike},last_name.ilike.${safeLike}`);
  }

  if (restrictToCustomerIds !== null) {
    query = restrictToCustomerIds.length > 0
      ? query.in('id', restrictToCustomerIds)
      : query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  switch (sort) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'orders':
      query = query.order('orders_count', { ascending: false, nullsFirst: false });
      break;
    case 'recent':
    default:
      // Identity grade is a per-page enrichment, so "risk" sorting falls back
      // to recency at the database level.
      query = query.order('updated_at', { ascending: false });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  // Gracefully fall back to empty results on any query error.
  // Server-level timeout is provided by the `maxDuration` export at the top of this file.
  // Note: Supabase query builders are thenable but do not implement .catch() — use try/catch.
  let customers: SourceCustomerRow[] = [];
  let count: number | null = null;
  try {
    const result = await query as unknown as { data: SourceCustomerRow[] | null; count: number | null };
    customers = result.data ?? [];
    count = result.count;
  } catch {
    customers = [];
    count = 0;
  }

  const customerIds = customers.map((c) => c.id);

  // -------------------------------------------------------------------------
  // Per-page aggregates: own-store orders + claims + identity grade.
  // -------------------------------------------------------------------------
  const ordersByCustomer = new Map<string, { count: number; first: string | null; last: string | null; orderIds: string[] }>();
  const claimsByCustomer = new Map<string, { claims: number; chargebacks: number }>();
  let gradeByEmailHash = new Map<string, IdentityGradeBadge>();
  let stateByIdentity = new Map<string, string>();

  if (customerIds.length > 0) {
    const [{ data: orderRows }, gradeMap] = await Promise.all([
      svc
        .from('source_orders')
        .select('id, source_customer_id, placed_at')
        .eq('merchant_id', ctx.merchantId)
        .in('source_customer_id', customerIds)
        .limit(10000) as unknown as Promise<{ data: OrderAggRow[] | null }>,
      lookupIdentityGradesByEmailHash(
        svc,
        ctx.merchantId,
        customers.flatMap((c) => {
          const norm = normaliseEmail(c.email);
          return norm ? [hashIdentifier(norm)] : [];
        }),
      ),
    ]);
    gradeByEmailHash = gradeMap;

    const orderCustomer = new Map<string, string>();
    for (const order of orderRows ?? []) {
      if (!order.source_customer_id) continue;
      orderCustomer.set(order.id, order.source_customer_id);
      const agg = ordersByCustomer.get(order.source_customer_id) ?? { count: 0, first: null, last: null, orderIds: [] };
      agg.count += 1;
      agg.orderIds.push(order.id);
      if (order.placed_at) {
        if (!agg.first || order.placed_at < agg.first) agg.first = order.placed_at;
        if (!agg.last || order.placed_at > agg.last) agg.last = order.placed_at;
      }
      ordersByCustomer.set(order.source_customer_id, agg);
    }

    const orderIds = Array.from(orderCustomer.keys());
    if (orderIds.length > 0) {
      const { data: claimRows } = await svc
        .from('claims')
        .select('id, claim_type, status, source_order_id')
        .eq('merchant_id', ctx.merchantId)
        .in('source_order_id', orderIds)
        .limit(10000) as unknown as { data: ClaimAggRow[] | null };
      for (const claim of claimRows ?? []) {
        const customerId = claim.source_order_id ? orderCustomer.get(claim.source_order_id) : undefined;
        if (!customerId) continue;
        const agg = claimsByCustomer.get(customerId) ?? { claims: 0, chargebacks: 0 };
        agg.claims += 1;
        if (claim.claim_type === CHARGEBACK_CLAIM_TYPE) agg.chargebacks += 1;
        claimsByCustomer.set(customerId, agg);
      }
    }

    // Merchant-side investigation status for the resolved identities.
    const identityIds = Array.from(new Set([...gradeMap.values()].map((g) => g.identityId)));
    if (identityIds.length > 0) {
      const { data: stateRows } = await svc
        .from('merchant_identity_state')
        .select('identity_id, investigation_status')
        .eq('merchant_id', ctx.merchantId)
        .in('identity_id', identityIds) as unknown as {
          data: Array<{ identity_id: string; investigation_status: string }> | null;
        };
      stateByIdentity = new Map((stateRows ?? []).map((r) => [r.identity_id, r.investigation_status]));
    }
  }

  let rows = customers.map((c) => {
    const norm = normaliseEmail(c.email);
    const grade = norm ? gradeByEmailHash.get(hashIdentifier(norm)) : undefined;
    const orders = ordersByCustomer.get(c.id);
    const claims = claimsByCustomer.get(c.id) ?? { claims: 0, chargebacks: 0 };
    const orderCount = Math.max(orders?.count ?? 0, c.orders_count ?? 0);
    return {
      id: c.id,
      risk_score: grade?.score ?? 0,
      // Identity confidence grade (displayed as confidence, never a verdict).
      risk_level: grade?.grade ?? 'none',
      total_orders: orderCount,
      total_refund_claims: claims.claims,
      total_chargebacks: claims.chargebacks,
      refund_rate: orderCount > 0 ? claims.claims / orderCount : 0,
      refund_acceleration_score: 0,
      total_merchants_seen_at: grade?.merchantCount ?? 1,
      fastest_claim_days: null as number | null,
      primary_email: c.email,
      names: displayNames(c),
      manually_reviewed: false,
      last_seen: orders?.last ?? c.updated_at,
      first_seen: orders?.first ?? c.account_created_at ?? c.created_at,
      profile_confidence: grade?.score ?? 0,
      investigation_status: (grade && stateByIdentity.get(grade.identityId)) ?? 'new',
    };
  });

  // Page-local filters that depend on identity enrichment.
  if (riskFilter) rows = rows.filter((r) => r.risk_level === riskFilter);
  if (statusFilter) rows = rows.filter((r) => r.investigation_status === statusFilter);

  const total = Math.max(count ?? 0, rows.length);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const noFilters = !q && !riskFilter && !hasRefunds && !hasChargebacks && !openClaimsOnly && !statusFilter;

  const { primary: primaryAction, subtitle: pageSubtitle } = resolveCustomerActions(setupState, connectionState);

  return (
    <CustomersOverviewPageView
      connectionState={connectionState}
      setupState={setupState}
      hasData={dataPresence.hasCustomerProfiles}
      pageActions={{ primary: primaryAction, subtitle: pageSubtitle }}
      sp={sp}
      rows={rows}
      totalCount={total}
      page={page}
      PAGE_SIZE={PAGE_SIZE}
      totalPages={totalPages}
      from={from}
      to={to}
      noFilters={noFilters}
      q={q}
      riskFilter={riskFilter}
      statusFilter={statusFilter}
      hasRefunds={hasRefunds}
      hasChargebacks={hasChargebacks}
      openClaimsOnly={openClaimsOnly}
    />
  );
}
