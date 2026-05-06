import { createClient, createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CustomersFilterSheet from '@/components/customers/CustomersFilterSheet';
import CustomersTableClient from '@/components/customers/CustomersTableClient';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { escapePostgrestFilterValue } from '@/lib/supabase/merchantHelpers';

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
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-soft)' }}
    >
      {label}
      <span aria-hidden="true" style={{ fontWeight: 700 }}>×</span>
    </Link>
  );
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

interface PageProps {
  searchParams: Promise<{
    // Basic
    q?: string;
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

export default async function CustomersOverviewPage({ searchParams: searchParamsPromise }: PageProps) {
  const searchParams = await searchParamsPromise;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve the merchants-table UUID so we can filter profiles from both
  // legacy uploads (stored with auth user UUID) and current uploads.
  const svc = createServiceClient();
  const { data: merchantRow } = await svc
    .from('merchants')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  const merchantId = merchantRow?.id ?? null;

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const requestedPageSize = parseInt(searchParams.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const PAGE_SIZE = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * PAGE_SIZE;

  // Basic
  const q               = searchParams.q?.trim() ?? '';
  const riskFilter      = searchParams.risk ?? '';
  const hasRefunds      = searchParams.hasRefunds === '1';
  const hasChargebacks  = searchParams.hasChargebacks === '1';
  const watchlistedOnly = searchParams.watchlisted === '1';
  const manuallyReviewed = searchParams.manuallyReviewed === '1';
  const sort            = searchParams.sort ?? 'risk';

  // Identity
  const ipFilter      = searchParams.ip?.trim() ?? '';
  const addressFilter = searchParams.address?.trim() ?? '';
  const cardFilter    = searchParams.card?.trim() ?? '';
  const phoneFilter   = searchParams.phone?.trim() ?? '';

  // Numeric ranges
  const riskMin         = searchParams.riskMin ? parseFloat(searchParams.riskMin) : null;
  const riskMax         = searchParams.riskMax ? parseFloat(searchParams.riskMax) : null;
  const refundRateMin   = searchParams.refundRateMin ? parseFloat(searchParams.refundRateMin) : null;
  const refundRateMax   = searchParams.refundRateMax ? parseFloat(searchParams.refundRateMax) : null;
  const ordersMin       = searchParams.ordersMin ? parseInt(searchParams.ordersMin, 10) : null;
  const ordersMax       = searchParams.ordersMax ? parseInt(searchParams.ordersMax, 10) : null;
  const claimsMin       = searchParams.claimsMin ? parseInt(searchParams.claimsMin, 10) : null;
  const claimsMax       = searchParams.claimsMax ? parseInt(searchParams.claimsMax, 10) : null;
  const chargebacksMin  = searchParams.chargebacksMin ? parseInt(searchParams.chargebacksMin, 10) : null;
  const merchantsMin    = searchParams.merchantsMin ? parseInt(searchParams.merchantsMin, 10) : null;
  const fastestClaimMax = searchParams.fastestClaimMax ? parseFloat(searchParams.fastestClaimMax) : null;

  // Date ranges
  const firstSeenFrom = searchParams.firstSeenFrom ?? '';
  const firstSeenTo   = searchParams.firstSeenTo ?? '';
  const lastSeenFrom  = searchParams.lastSeenFrom ?? '';
  const lastSeenTo    = searchParams.lastSeenTo ?? '';

  // Fraud flag
  const flagFilter = searchParams.flag?.trim() ?? '';

  // Investigation status
  const statusFilter = searchParams.status?.trim() ?? '';

  // Scope to profiles this merchant owns — accepts both the auth-user UUID
  // (legacy, pre-merchants-table uploads) and the merchants-table UUID (current).
  const merchantFilter = merchantId
    ? `merchant_ids.cs.${JSON.stringify([user.id])},merchant_ids.cs.${JSON.stringify([merchantId])}`
    : `merchant_ids.cs.${JSON.stringify([user.id])}`;

  let query = svc
    .from('customer_profiles')
    .select(
      'id, risk_score, risk_level, total_orders, total_refund_claims, total_chargebacks, refund_rate, refund_acceleration_score, total_merchants_seen_at, fastest_claim_days, primary_email, names, on_watchlist, manually_reviewed, last_seen, first_seen, profile_confidence, investigation_status',
      { count: 'exact' }
    )
    .or(merchantFilter);

  // Text search (email or name)
  if (q.length >= 2) {
    // Use shared escape helper — prevents PostgREST filter injection via
    // ( ) ' % , { } " \ and other control characters.
    const safeQ = escapePostgrestFilterValue(q);
    query = query.or(`primary_email.ilike.%${safeQ}%,names.cs.["${safeQ}"]`);
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

  const total = count ?? 0;
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
    <div className="p-6 md:p-8 space-y-5">
      <PageHeader
        title="Customers"
        subtitle="Segment, filter, and act on all customer risk profiles."
        actions={
          <Link href="/upload" className="btn-accent px-4 py-2 rounded-md text-body-sm font-semibold transition-colors">
            New Audit
          </Link>
        }
      />

      {/* ── Cohort summary cards ──────────────────────────────────── */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New to review', href: '?risk=high&status=new', highlight: true },
            { label: 'Has refunds', href: '?hasRefunds=1' },
            { label: 'Has chargebacks', href: '?hasChargebacks=1' },
            { label: 'Watchlisted', href: '?watchlisted=1' },
          ].map(({ label, href, highlight }) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg px-4 py-3 border hover:shadow-sm transition-shadow group"
              style={{
                background: highlight ? 'var(--accent-soft)' : 'var(--bg-surface)',
                borderColor: highlight ? 'var(--accent)' : 'var(--border-subtle)',
              }}
            >
              <p className="text-caption" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-heading-sm font-medium mt-0.5 group-hover:underline" style={{ color: highlight ? 'var(--accent)' : 'var(--text)' }}>
                Filter →
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* ── Saved views strip ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-caption font-medium" style={{ color: 'var(--text-muted)' }}>Saved views:</span>
        {[
          { label: 'High-confidence unresolved', href: '?risk=high&status=new' },
          { label: 'Repeat refund claims', href: '?hasRefunds=1&sort=refundRate' },
          { label: 'Linked identities', href: '?merchantsMin=2' },
          { label: 'Fast claimants', href: '?fastestClaimMax=3' },
        ].map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="text-xs px-3 py-1 rounded-full border transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            {label}
          </Link>
        ))}
      </div>

      <CustomersFilterSheet />

      {/* ── Active filter chips ───────────────────────────────────── */}
      {!noFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption" style={{ color: 'var(--text-muted)' }}>Active filters:</span>
          {riskFilter && <FilterChip label={`Risk: ${riskFilter}`} removeHref={buildRemoveHref(searchParams, 'risk')} />}
          {statusFilter && <FilterChip label={`Status: ${statusFilter}`} removeHref={buildRemoveHref(searchParams, 'status')} />}
          {hasRefunds && <FilterChip label="Has refunds" removeHref={buildRemoveHref(searchParams, 'hasRefunds')} />}
          {hasChargebacks && <FilterChip label="Has chargebacks" removeHref={buildRemoveHref(searchParams, 'hasChargebacks')} />}
          {watchlistedOnly && <FilterChip label="Watchlisted" removeHref={buildRemoveHref(searchParams, 'watchlisted')} />}
          {q && <FilterChip label={`Search: "${q}"`} removeHref={buildRemoveHref(searchParams, 'q')} />}
          <Link href="/customers" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>Clear all</Link>
        </div>
      )}

      {rows.length === 0 && noFilters ? (
        <div className="rounded-lg p-10 text-center" style={{ border: '1.5px dashed var(--border)' }}>
          <p className="text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No customer profiles yet</p>
          <p className="text-body-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Run an audit to populate this list. Customer profiles are built automatically from your uploaded transaction data.
          </p>
          <Link href="/upload" className="inline-block text-sm font-medium underline" style={{ color: 'var(--text)' }}>
            Upload a CSV →
          </Link>
        </div>
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
                <PageSizeSelect pathname="/customers" searchParams={searchParams} pageSize={PAGE_SIZE} />
                {page > 1 && (
                  <Link
                    href={`/customers?${new URLSearchParams({ ...searchParams, page: String(page - 1), pageSize: String(PAGE_SIZE) }).toString()}`}
                    className="px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >← Prev</Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/customers?${new URLSearchParams({ ...searchParams, page: String(page + 1), pageSize: String(PAGE_SIZE) }).toString()}`}
                    className="px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >Next →</Link>
                )}
              </div>
            )}
          </div>

          {rows.length > 0 && <CustomersTableClient rows={rows} />}
        </>
      )}
    </div>
  );
}
