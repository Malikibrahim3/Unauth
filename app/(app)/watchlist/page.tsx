import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import WatchlistTableClient from '@/components/watchlist/WatchlistTableClient';
import WatchlistSearchInput from '@/components/watchlist/WatchlistSearchInput';
import { formatDate } from '@/lib/utils/format';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { Button, WorkbenchActionBar, WorkbenchEmptyState, WorkbenchKpiStrip, WorkbenchPage } from '@/components/ui';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveCallerContext } from '@/lib/permissions';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

export default async function WatchlistPage({ searchParams }: { searchParams?: { page?: string; pageSize?: string; q?: string } }) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  const ctx = await resolveCallerContext(serviceClient, user.id);
  if (!ctx) {
    const { redirect } = await import('next/navigation');
    redirect('/onboarding');
  }

  // Fetch watchlist entries and recent appearances in parallel
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const page = Math.max(1, parseInt(sp?.page ?? '1', 10));
  const requestedPageSize = parseInt(sp?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const querySearchParams = sp ?? {};
  const searchQuery = (sp?.q ?? '').trim();

  const [{ data: entries, count }, { data: recentRaw }] = await Promise.all([
    (() => {
      let q = supabase
        .from('watchlist_entries')
        .select('*', { count: 'exact' })
        .eq('merchant_id', ctx.merchantId)
        .eq('removed_by_merchant', false)
        .order('added_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (searchQuery) {
        // Substring match on display_name or display_email (case-insensitive)
        q = q.or(
          `display_name.ilike.%${searchQuery}%,display_email.ilike.%${searchQuery}%`,
        );
      }
      return q;
    })(),
    supabase
      .from('customer_profile_audit_appearances')
      .select(`
        id,
        profile_id,
        audit_id,
        score_at_time,
        appeared_at,
        customer_profiles!inner(primary_email, names, risk_level),
        processing_jobs!inner(id, created_at, total_rows)
      `)
      .gte('appeared_at', thirtyDaysAgo)
      .order('appeared_at', { ascending: false })
      .limit(10),
  ]);

  const rows = (entries ?? []) as Array<{
    id: string;
    customer_profile_id: string | null;
    display_name: string | null;
    display_email: string | null;
    last_seen_risk: string | null;
    added_at: string;
    last_seen_at: string | null;
  }>;

  // Filter recent appearances to only those whose profile_id is in the watchlist
  const watchlistedProfileIds = new Set(rows.map((r) => r.customer_profile_id).filter(Boolean));

  type RecentRow = {
    id: string;
    profile_id: string;
    audit_id: string;
    score_at_time: number;
    appeared_at: string;
    customer_profiles: { primary_email: string | null; names: string[] | null; risk_level: string };
    processing_jobs: { id: string; created_at: string; total_rows: number };
  };

  const recentAppearances = ((recentRaw ?? []) as unknown as RecentRow[]).filter(
    (r) => watchlistedProfileIds.has(r.profile_id)
  );

  // Build per-profile score history map (oldest-first, up to 10 snapshots)
  // Used to compute risk trend in the watchlist table.
  const trendScoresMap = new Map<string, number[]>();
  for (const r of ((recentRaw ?? []) as unknown as RecentRow[])) {
    if (!watchlistedProfileIds.has(r.profile_id)) continue;
    if (!trendScoresMap.has(r.profile_id)) trendScoresMap.set(r.profile_id, []);
    trendScoresMap.get(r.profile_id)!.push(r.score_at_time);
  }
  // recentRaw is newest-first — reverse so scores are oldest-first for trend calc
  trendScoresMap.forEach((scores, key) => trendScoresMap.set(key, scores.slice().reverse()));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <WorkbenchPage
      title="Watchlist"
      subtitle="Customers you're monitoring across future audits."
      navItems={[
        { key: 'overview', label: 'Overview', href: '/dashboard' },
        { key: 'cases', label: 'Cases', href: '/inbox' },
        { key: 'clusters', label: 'Clusters', href: '/customers?merchantsMin=2' },
        { key: 'audits', label: 'Audits', href: '/history' },
        { key: 'reports', label: 'Reports', href: '/chargebacks' },
      ]}
      activeNavKey="clusters"
      actions={<Link href="/customers"><Button size="sm">Browse Customers</Button></Link>}
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Watchlisted', value: total.toLocaleString(), hint: 'Total entries' },
            { label: 'Appeared 30d', value: recentAppearances.length.toLocaleString(), hint: 'Recent audits' },
            { label: 'Search', value: searchQuery ? 'On' : 'Off', hint: searchQuery || 'No query' },
            { label: 'Page size', value: pageSize.toLocaleString(), hint: 'Rows per page' },
            { label: 'Pages', value: totalPages.toLocaleString(), hint: 'Result pages' },
          ]}
        />
      }
      actionBar={
        <WorkbenchActionBar
          left={<WatchlistSearchInput defaultValue={searchQuery} />}
          right={
            <div className="flex items-center gap-2">
              <PageSizeSelect pathname="/watchlist" searchParams={querySearchParams} pageSize={pageSize} />
              {totalPages > 1 && (
                <>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                  {page > 1 && <Link href={`/watchlist?${new URLSearchParams({ ...querySearchParams, page: String(page - 1), pageSize: String(pageSize) }).toString()}`}><Button variant="secondary" size="sm">Prev</Button></Link>}
                  {page < totalPages && <Link href={`/watchlist?${new URLSearchParams({ ...querySearchParams, page: String(page + 1), pageSize: String(pageSize) }).toString()}`}><Button variant="secondary" size="sm">Next</Button></Link>}
                </>
              )}
            </div>
          }
        />
      }
      main={<div className="p-4 space-y-6">

      {/* Recent appearances section */}
      <div>
        <h2 className="text-body-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Appeared in recent audits</h2>
        {recentAppearances.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>No watchlisted customers have appeared in recent audits.</p>
        ) : (
          <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--watchlist-bg)', borderColor: 'var(--watchlist-bd)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--watchlist-bd)' }}>
                  <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--watchlist)' }}>Customer</th>
                  <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--watchlist)' }}>Audit</th>
                  <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--watchlist)' }}>Score</th>
                  <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--watchlist)' }}>Risk</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {recentAppearances.map((r) => (
                  <tr key={r.id} className="border-b transition-colors hover-bg-watchlist" style={{ borderColor: 'var(--watchlist-bd)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>{r.customer_profiles.names?.[0] ?? '—'}</div>
                      <div className="text-caption" style={{ color: 'var(--text-muted)' }}>{r.customer_profiles.primary_email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(r.processing_jobs.created_at)}
                      <span className="ml-1" style={{ color: 'var(--text-subtle)' }}>({r.processing_jobs.total_rows.toLocaleString()} rows)</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round(r.score_at_time)}</td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge grade={riskLevelToNewGrade(r.customer_profiles.risk_level)} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/audit/${r.processing_jobs.id}`} className="text-xs font-semibold hover:underline" style={{ color: 'var(--watchlist)' }}>
                        View audit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border" style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}>
          <WorkbenchEmptyState
            title={searchQuery ? 'No results' : 'Your watchlist is empty'}
            description={
              searchQuery
                ? `No watchlisted customers match "${searchQuery}".`
                : "Star any customer on an audit to keep an eye on them — they'll appear here with their latest match confidence every time you upload new orders."
            }
            action={
              !searchQuery ? (
                <Link href="/upload" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                  Upload an audit
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>All watchlisted customers</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-caption" style={{ color: 'var(--text-muted)' }}>Paged and searchable watchlist.</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Page {page} of {totalPages}</span>
                  {page > 1 && (
                    <Link
                      href={`/watchlist?${new URLSearchParams({ ...querySearchParams, page: String(page - 1), pageSize: String(pageSize) }).toString()}`}
                      className="px-2 py-1 rounded border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      ← Prev
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/watchlist?${new URLSearchParams({ ...querySearchParams, page: String(page + 1), pageSize: String(pageSize) }).toString()}`}
                      className="px-2 py-1 rounded border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      Next →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
          <WatchlistTableClient rows={rows.map((r) => ({
            ...r,
            risk_trend_scores: r.customer_profile_id
              ? (trendScoresMap.get(r.customer_profile_id) ?? [])
              : [],
          }))} />
        </div>
      )}
      </div>}
    />
  );
}
