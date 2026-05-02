import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CustomersFilterBar from '@/components/customers/CustomersFilterBar';
import CustomersTableClient from '@/components/customers/CustomersTableClient';

const PAGE_SIZE = 25;

interface PageProps {
  searchParams: {
    // Basic
    q?: string;
    risk?: string;
    hasRefunds?: string;
    hasChargebacks?: string;
    watchlisted?: string;
    manuallyReviewed?: string;
    sort?: string;
    page?: string;
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
  };
}

export default async function CustomersOverviewPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
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

  let query = supabase
    .from('customer_profiles')
    .select(
      'id, risk_score, risk_level, total_orders, total_refund_claims, total_chargebacks, refund_rate, refund_acceleration_score, total_merchants_seen_at, fastest_claim_days, primary_email, names, on_watchlist, manually_reviewed, last_seen, first_seen, profile_confidence',
      { count: 'exact' }
    );

  // Text search (email or name)
  if (q.length >= 2) {
    query = query.or(`primary_email.ilike.%${q}%,names.cs.["${q}"]`);
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
    !firstSeenFrom && !firstSeenTo && !lastSeenFrom && !lastSeenTo && !flagFilter;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-heading-lg">Customers</h1>
      <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>All customers identified across your audits, highest-risk first.</p>

      <CustomersFilterBar />

      {rows.length === 0 && noFilters ? (
        <div className="rounded-lg p-10" style={{ border: '1.5px dashed var(--border)' }}>
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>No customer profiles yet. Run an audit to populate this list.</p>
          <Link href="/upload" className="mt-4 inline-block text-sm font-medium underline" style={{ color: 'var(--text)' }}>
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
                {page > 1 && (
                  <Link
                    href={`/customers?${new URLSearchParams({ ...searchParams, page: String(page - 1) }).toString()}`}
                    className="px-2 py-1 rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >← Prev</Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/customers?${new URLSearchParams({ ...searchParams, page: String(page + 1) }).toString()}`}
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
