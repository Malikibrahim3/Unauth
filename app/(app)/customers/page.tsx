// TODO(product-gating): require CUSTOMER_SEARCH entitlement when ENFORCE_PRODUCT_GATES is enabled.
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { getMerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import { resolveMerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { redirect } from 'next/navigation';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { escapePostgrestFilterValue, getMerchantOwnedJobIds } from '@/lib/supabase/merchantHelpers';
import { isOrderReferenceSearchTerm, orderReferenceIlike } from '@/lib/customers/orderSearch';
import { findCustomerProfileIdsByText } from '@/lib/customers/profileSearch';
import { CustomersOverviewPageView } from '@/app/(app)/customers/CustomersOverviewPageView';
import { resolveCustomerActions } from '@/app/(app)/customers/customersOverviewPageUtils';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

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

  const [connectionState, dataPresence] = await Promise.all([
    getConnectionState(svc, ctx.merchantId),
    getMerchantDataPresence(svc, ctx.merchantId, user.id),
  ]);
  const setupState = resolveMerchantSetupState(connectionState, dataPresence);

  // `searchParams` may be a Promise in newer Next.js versions - await to normalize.
  const sp = (await Promise.resolve(searchParams)) ?? {};

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
  const watchlistedOnly = sp.watchlisted === '1';
  const manuallyReviewed = sp.manuallyReviewed === '1';
  const sort            = sp.sort ?? 'risk';

  // Identity
  const ipFilter      = sp.ip?.trim() ?? '';
  const addressFilter = sp.address?.trim() ?? '';
  const cardFilter    = sp.card?.trim() ?? '';
  const phoneFilter   = sp.phone?.trim() ?? '';

  // Numeric ranges
  const riskMin         = sp.riskMin ? parseFloat(sp.riskMin) : null;
  const riskMax         = sp.riskMax ? parseFloat(sp.riskMax) : null;
  const refundRateMin   = sp.refundRateMin ? parseFloat(sp.refundRateMin) : null;
  const refundRateMax   = sp.refundRateMax ? parseFloat(sp.refundRateMax) : null;
  const ordersMin       = sp.ordersMin ? parseInt(sp.ordersMin, 10) : null;
  const ordersMax       = sp.ordersMax ? parseInt(sp.ordersMax, 10) : null;
  const claimsMin       = sp.claimsMin ? parseInt(sp.claimsMin, 10) : null;
  const claimsMax       = sp.claimsMax ? parseInt(sp.claimsMax, 10) : null;
  const chargebacksMin  = sp.chargebacksMin ? parseInt(sp.chargebacksMin, 10) : null;
  const merchantsMin    = sp.merchantsMin ? parseInt(sp.merchantsMin, 10) : null;
  const fastestClaimMax = sp.fastestClaimMax ? parseFloat(sp.fastestClaimMax) : null;

  // Date ranges
  const firstSeenFrom = sp.firstSeenFrom ?? '';
  const firstSeenTo   = sp.firstSeenTo ?? '';
  const lastSeenFrom  = sp.lastSeenFrom ?? '';
  const lastSeenTo    = sp.lastSeenTo ?? '';

  // Fraud flag
  const flagFilter = sp.flag?.trim() ?? '';

  // Investigation status
  const statusFilter = sp.status?.trim() ?? '';

  // Scope to profiles this merchant owns - accepts both the auth-user UUID
  // (legacy, pre-merchants-table uploads) and the merchants-table UUID (current).
  const merchantFilter = [
    `merchant_ids.cs.${JSON.stringify([ctx.merchantId])}`,
    `merchant_ids.cs.${JSON.stringify([user.id])}`,
  ].join(',');
  const isOrderReferenceSearch = isOrderReferenceSearchTerm(q);
  let orderMatchedProfileIds: string[] | null = null;
  let textMatchedProfileIds: string[] | null = null;

  if (isOrderReferenceSearch) {
    const ids = new Set<string>();
    const ilike = orderReferenceIlike(q);

    const claimsWithOrderRef = await svc
      .from('merchant_claims' as any)
      .select('customer_id')
      .eq('merchant_id', ctx.merchantId)
      .or(`shopify_order_id.ilike.${ilike},order_ref.ilike.${ilike}`)
      .limit(100);
    let claimRows = claimsWithOrderRef.data as Array<{ customer_id: string | null }> | null;

    if (claimsWithOrderRef.error) {
      const fallbackClaims = await svc
        .from('merchant_claims' as any)
        .select('customer_id')
        .eq('merchant_id', ctx.merchantId)
        .ilike('shopify_order_id', ilike)
        .limit(100);
      claimRows = fallbackClaims.data as Array<{ customer_id: string | null }> | null;
    }

    for (const row of claimRows ?? []) {
      if (row.customer_id) ids.add(row.customer_id);
    }

    const ownedJobIds = await getMerchantOwnedJobIds(svc, ctx.merchantId);
    if (ownedJobIds.length > 0) {
      const { data: txRows } = await svc
        .from(TABLES.AUDIT_TRANSACTIONS)
        .select('id')
        .in('job_id', ownedJobIds)
        .ilike('order_id', ilike)
        .limit(100) as unknown as { data: Array<{ id: string }> | null };
      const txIds = (txRows ?? []).map((row) => row.id);
      if (txIds.length > 0) {
        const { data: appearanceRows } = await svc
          .from('customer_profile_audit_appearances' as any)
          .select('profile_id')
          .in('audit_id', ownedJobIds)
          .in('transaction_id', txIds) as unknown as { data: Array<{ profile_id: string }> | null };
        for (const row of appearanceRows ?? []) ids.add(row.profile_id);
      }
    }

    orderMatchedProfileIds = Array.from(ids);
  } else if (q.length >= 2) {
    textMatchedProfileIds = await findCustomerProfileIdsByText(svc, {
      merchantIds: [ctx.merchantId, user.id],
      merchantFilter,
      query: q,
    });
  }

  let query = svc
    .from(TABLES.CUSTOMER_PROFILES)
    .select(
      'id, risk_score, risk_level, total_orders, total_refund_claims, total_chargebacks, refund_rate, refund_acceleration_score, total_merchants_seen_at, fastest_claim_days, primary_email, names, on_watchlist, manually_reviewed, last_seen, first_seen, profile_confidence, investigation_status',
      { count: 'exact' }
    )
    .or(merchantFilter);

  // Text search (email or name)
  if (q.length >= 2) {
    if (isOrderReferenceSearch) {
      query = orderMatchedProfileIds && orderMatchedProfileIds.length > 0
        ? query.in('id', orderMatchedProfileIds)
        : query.eq('id', '00000000-0000-0000-0000-000000000000');
    } else {
      query = textMatchedProfileIds && textMatchedProfileIds.length > 0
        ? query.in('id', textMatchedProfileIds)
        : query.eq('id', '00000000-0000-0000-0000-000000000000');
    }
  }

  // Identity exact-match filters
  if (ipFilter.length >= 4) {
    query = query.filter('ips', 'cs', JSON.stringify([ipFilter]));
  }
  if (addressFilter.length >= 4) {
    query = (query as any).ilike('addresses::text', `%${escapePostgrestFilterValue(addressFilter)}%`);
  }
  if (cardFilter.length >= 2) {
    query = query.filter('card_last4s', 'cs', JSON.stringify([cardFilter]));
  }
  if (phoneFilter.length >= 4) {
    query = (query as any).ilike('phones::text', `%${escapePostgrestFilterValue(phoneFilter)}%`);
  }

  // Risk level
  if (riskFilter) {
    query = query.eq('risk_level', riskFilter);
  }

  // Numeric ranges
  if (riskMin !== null)        query = query.gte('risk_score', riskMin);
  if (riskMax !== null)        query = query.lte('risk_score', riskMax);
  if (refundRateMin !== null)  query = query.gte('refund_rate', refundRateMin / 100);
  if (refundRateMax !== null)  query = query.lte('refund_rate', refundRateMax / 100);
  if (ordersMin !== null)      query = query.gte('total_orders', ordersMin);
  if (ordersMax !== null)      query = query.lte('total_orders', ordersMax);
  if (claimsMin !== null)      query = query.gte('total_refund_claims', claimsMin);
  if (claimsMax !== null)      query = query.lte('total_refund_claims', claimsMax);
  if (chargebacksMin !== null) query = query.gte('total_chargebacks', chargebacksMin);
  if (merchantsMin !== null)   query = query.gte('total_merchants_seen_at', merchantsMin);
  if (fastestClaimMax !== null) query = query.lte('fastest_claim_days', fastestClaimMax);

  // Boolean flags
  if (hasRefunds)      query = query.gt('total_refund_claims', 0);
  if (hasChargebacks)  query = query.gt('total_chargebacks', 0);
  if (watchlistedOnly) query = query.eq('on_watchlist', true);
  if (manuallyReviewed) query = query.eq('manually_reviewed', true);

  // Date ranges
  if (firstSeenFrom) query = query.gte('first_seen', firstSeenFrom);
  if (firstSeenTo)   query = query.lte('first_seen', firstSeenTo);
  if (lastSeenFrom)  query = query.gte('last_seen', lastSeenFrom);
  if (lastSeenTo)    query = query.lte('last_seen', lastSeenTo);

  // Fraud flag substring
  if (flagFilter.length >= 2) {
    query = (query as any).ilike('identity_signals::text', `%${escapePostgrestFilterValue(flagFilter)}%`);
  }

  // Investigation status
  if (statusFilter) {
    query = query.eq('investigation_status', statusFilter);
  }

  switch (sort) {
    case 'recent':
      query = query.order('last_seen', { ascending: false });
      break;
    case 'oldest':
      query = query.order('first_seen', { ascending: true });
      break;
    case 'orders':
      query = query.order('total_orders', { ascending: false });
      break;
    case 'refundRate':
      query = query.order('refund_rate', { ascending: false });
      break;
    case 'chargebacks':
      query = query.order('total_chargebacks', { ascending: false });
      break;
    case 'merchants':
      query = query.order('total_merchants_seen_at', { ascending: false });
      break;
    case 'fastestClaim':
      query = query.order('fastest_claim_days', { ascending: true });
      break;
    default:
      query = query.order('risk_score', { ascending: false });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: profiles, count } = await query;

  const rows = (profiles ?? []) as Array<{
    id: string;
    risk_score: number;
    risk_level: string;
    total_orders: number;
    total_refund_claims: number;
    total_chargebacks: number;
    refund_rate: number;
    refund_acceleration_score: number;
    total_merchants_seen_at: number;
    fastest_claim_days: number | null;
    primary_email: string | null;
    names: string[] | null;
    on_watchlist: boolean;
    manually_reviewed: boolean;
    last_seen: string;
    first_seen: string;
    profile_confidence: number;
    investigation_status: string;
  }>;

  const total = Math.max(count ?? 0, rows.length);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const noFilters = !q && !riskFilter && !hasRefunds && !hasChargebacks && !watchlistedOnly &&
    !manuallyReviewed && !ipFilter && !addressFilter && !cardFilter && !phoneFilter &&
    riskMin === null && riskMax === null && refundRateMin === null && refundRateMax === null &&
    ordersMin === null && ordersMax === null && claimsMin === null && claimsMax === null &&
    chargebacksMin === null && merchantsMin === null && fastestClaimMax === null &&
    !firstSeenFrom && !firstSeenTo && !lastSeenFrom && !lastSeenTo && !flagFilter && !statusFilter;


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
      watchlistedOnly={watchlistedOnly}
    />
  );
}
