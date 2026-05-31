import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import CustomersFilterSheet from '@/components/customers/CustomersFilterSheet';
import CustomersTableClient from '@/components/customers/CustomersTableClient';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { Button, WorkbenchActionBar, WorkbenchEmptyState, WorkbenchKpiStrip, WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { RISK_TIER_COPY } from '@/lib/copy/riskTiers';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';
import { STATUS_LABELS } from '@/lib/utils/investigationStatus';
import { getMerchantOwnedJobIds } from '@/lib/supabase/merchantHelpers';
import { isOrderReferenceSearchTerm, orderReferenceIlike } from '@/lib/customers/orderSearch';

// Helper: build a URL with one search param removed
function buildRemoveHref(sp: Record<string, string | undefined>, key: string) {
  const copy = { ...sp };
  delete copy[key];
  delete copy['page'];
  const qs = new URLSearchParams(copy as Record<string, string>).toString();
  return `/customers${qs ? `?${qs}` : ''}`;
}

// Small inline filter chip component
function FilterChip({ label, removeHref }: { label: string; removeHref: string }) {
  return (
    <Link
      href={removeHref}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[3px] border transition-colors hover:bg-[var(--surface-overlay)]"
      style={{ borderColor: 'var(--copper-bright)', color: 'var(--copper-bright)', background: 'var(--copper-glow)' }}
    >
      {label}
      <span aria-hidden="true" style={{ fontWeight: 700 }}>×</span>
    </Link>
  );
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

export const dynamic = 'force-dynamic';

function customersListHref(
  sp: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...sp, ...overrides })) {
    if (value != null && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/customers?${qs}` : '/customers';
}

interface PageProps {
  searchParams: Promise<{
    // Basic
    q?: string;
    /** Alias for q= — used by Gorgias widget and Chrome extension deep links */
    email?: string;
    risk?: string;
    hasRefunds?: string;
    hasChargebacks?: string;
    watchlisted?: string;
    manuallyReviewed?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
    // Identity
    ip?: string;
    address?: string;
    card?: string;
    phone?: string;
    // Numeric ranges
    riskMin?: string;
    riskMax?: string;
    refundRateMin?: string;
    refundRateMax?: string;
    ordersMin?: string;
    ordersMax?: string;
    claimsMin?: string;
    claimsMax?: string;
    chargebacksMin?: string;
    merchantsMin?: string;
    fastestClaimMax?: string;
    // Date ranges
    firstSeenFrom?: string;
    firstSeenTo?: string;
    lastSeenFrom?: string;
    lastSeenTo?: string;
    // Fraud flag
    flag?: string;
    // Investigation status
    status?: string;
  }>;
}

export default async function CustomersOverviewPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return redirect(await resolveDefaultAppPath(svc, user.id));
  // `searchParams` may be a Promise in newer Next.js versions — await to normalize.
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

  // Scope to profiles this merchant owns — accepts both the auth-user UUID
  // (legacy, pre-merchants-table uploads) and the merchants-table UUID (current).
  const merchantFilter = [
    `merchant_ids.cs.${JSON.stringify([ctx.merchantId])}`,
    `merchant_ids.cs.${JSON.stringify([user.id])}`,
  ].join(',');
  const isOrderReferenceSearch = isOrderReferenceSearchTerm(q);
  let orderMatchedProfileIds: string[] | null = null;

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
      // Use shared escape helper — prevents PostgREST filter injection via
      // ( ) ' % , { } " \ and other control characters.
      const safeQ = escapePostgrestFilterValue(q);
      query = query.or(
        [
          `primary_email.ilike.%${safeQ}%`,
          `emails::text.ilike.%${safeQ}%`,
          `names::text.ilike.%${safeQ}%`,
          `phones::text.ilike.%${safeQ}%`,
          `addresses::text.ilike.%${safeQ}%`,
        ].join(',')
      );
    }
  }

  // Identity exact-match filters
  if (ipFilter.length >= 4) {
    query = query.filter('ips', 'cs', JSON.stringify([ipFilter]));
  }
  if (addressFilter.length >= 4) {
    query = (query as any).ilike('addresses::text', `%${addressFilter}%`);
  }
  if (cardFilter.length >= 2) {
    query = query.filter('card_last4s', 'cs', JSON.stringify([cardFilter]));
  }
  if (phoneFilter.length >= 4) {
    query = (query as any).ilike('phones::text', `%${phoneFilter}%`);
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
    query = (query as any).ilike('identity_signals::text', `%${flagFilter}%`);
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

  return (
    <WorkbenchPage
      title="Customers"
      subtitle="Search, filter, and act on customer identity profiles."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="customers"
      actions={<Link href="/upload"><Button size="sm">New audit</Button></Link>}
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Profiles', value: total.toLocaleString(), hint: 'Filtered result set' },
            { label: 'Watchlisted', value: rows.filter((r) => r.on_watchlist).length.toLocaleString(), hint: 'Current page' },
            { label: 'New status', value: rows.filter((r) => r.investigation_status === 'new').length.toLocaleString(), hint: 'Current page' },
            { label: 'Has refunds', value: rows.filter((r) => r.total_refund_claims > 0).length.toLocaleString(), hint: 'Current page' },
            { label: 'Linked identities', value: rows.filter((r) => r.total_merchants_seen_at >= 2).length.toLocaleString(), hint: 'Current page' },
          ]}
        />
      }
      actionBar={
        <WorkbenchActionBar
          left={
            <Suspense fallback={<div className="h-10 w-full max-w-xl animate-pulse rounded-lg" style={{ background: 'var(--bg-subtle)' }} />}>
              <CustomersFilterSheet />
            </Suspense>
          }
          right={
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>Rows per page…</span>}>
                <PageSizeSelect pathname="/customers" pageSize={PAGE_SIZE} />
              </Suspense>
              {totalPages > 1 && (
                <>
                  <span>Page {page} of {totalPages}</span>
                  {page > 1 && (
                    <Link href={customersListHref(sp, { page: String(page - 1), pageSize: String(PAGE_SIZE) })}>
                      <Button variant="secondary" size="sm">Prev</Button>
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={customersListHref(sp, { page: String(page + 1), pageSize: String(PAGE_SIZE) })}>
                      <Button variant="secondary" size="sm">Next</Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          }
        />
      }
      main={
        <div className="p-4 space-y-4">

      {/* ── Compact filter bar ─────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex h-auto min-h-10 flex-wrap items-center gap-2 rounded-md border px-3 py-2" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
          <span className="t-label mr-1" style={{ color: 'var(--ink-tertiary)' }}>Filters</span>
          {[
            { label: 'New to review', href: '?risk=high&status=new', highlight: true },
            { label: 'Has refunds', href: '?hasRefunds=1' },
            { label: 'Has chargebacks', href: '?hasChargebacks=1' },
            { label: 'Watchlisted', href: '?watchlisted=1' },
          ].map(({ label, href, highlight }) => (
            <Link
              key={label}
              href={href}
              className="rounded-sm border px-2.5 py-1 t-label transition-colors"
              style={{
                background: highlight ? 'var(--copper-dim)' : 'var(--surface-muted)',
                borderColor: highlight ? 'var(--copper-bright)' : 'var(--surface-border)',
                color: highlight ? 'var(--copper-bright)' : 'var(--ink-secondary)',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* ── Saved views strip ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="t-label" style={{ color: 'var(--ink-tertiary)' }}>Saved views</span>
        {[
          { label: 'High-confidence unresolved', href: '?risk=high&status=new' },
          { label: 'Repeat refund claims', href: '?hasRefunds=1&sort=refundRate' },
          { label: 'Linked identities', href: '?merchantsMin=2' },
          { label: 'Fast claimants', href: '?fastestClaimMax=3' },
        ].map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="t-label rounded-sm border px-2.5 py-1 transition-colors hover:bg-[var(--surface-overlay)]"
            style={{ borderColor: 'var(--surface-border)', color: 'var(--ink-secondary)' }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Active filter chips ───────────────────────────────────── */}
      {!noFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>Active filters:</span>
          {riskFilter && <FilterChip label={`Match confidence: ${RISK_TIER_COPY[riskFilter as keyof typeof RISK_TIER_COPY]?.label ?? riskFilter}`} removeHref={buildRemoveHref(sp, 'risk')} />}
          {statusFilter && <FilterChip label={`Status: ${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS] ?? statusFilter}`} removeHref={buildRemoveHref(sp, 'status')} />}
          {hasRefunds && <FilterChip label="Has refunds" removeHref={buildRemoveHref(sp, 'hasRefunds')} />}
          {hasChargebacks && <FilterChip label="Has chargebacks" removeHref={buildRemoveHref(sp, 'hasChargebacks')} />}
          {watchlistedOnly && <FilterChip label="Watchlisted" removeHref={buildRemoveHref(sp, 'watchlisted')} />}
          {q && <FilterChip label={`Search: "${q}"`} removeHref={buildRemoveHref(sp, 'q')} />}
          <Link href="/customers" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>Clear all</Link>
        </div>
      )}

      {rows.length === 0 && noFilters ? (
        <WorkbenchEmptyState
          title="No customer profiles yet"
          description="Run an audit to populate this list. Customer profiles are built from your uploaded transaction data."
          action={<Link href="/upload" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Upload a CSV</Link>}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
              {total === 0
                ? 'No customers match your filters.'
                : `Showing ${from}–${to} of ${total.toLocaleString()} customers`}
            </p>
                {totalPages > 1 && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Page {page} of {totalPages}</span>
                <Suspense fallback={null}>
                  <PageSizeSelect pathname="/customers" pageSize={PAGE_SIZE} />
                </Suspense>
                {page > 1 && (
                  <Link
                    href={customersListHref(sp, { page: String(page - 1), pageSize: String(PAGE_SIZE) })}
                    className="px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >← Prev</Link>
                )}
                {page < totalPages && (
                  <Link
                    href={customersListHref(sp, { page: String(page + 1), pageSize: String(PAGE_SIZE) })}
                    className="px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >Next ›</Link>
                )}
              </div>
            )}
          </div>

          {rows.length > 0 && <CustomersTableClient rows={rows} />}
        </>
      )}
        </div>
      }
    />
  );
}
