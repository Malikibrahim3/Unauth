import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import WatchlistTableClient from '@/components/watchlist/WatchlistTableClient';
import WatchlistSearchInput from '@/components/watchlist/WatchlistSearchInput';
import { formatDate } from '@/lib/utils/format';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { Button, PageHeader, MetricCard, SectionCard, EmptyState } from '@/components/ui';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveCallerContext } from '@/lib/permissions';
import { Eye, Activity, Users, ArrowRight, ArrowUpRight } from 'lucide-react';

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
  const resolvedCtx = ctx!;

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

  const [{ data: entries, count }, { data: allWatchlistIds }, { data: recentRaw }] = await Promise.all([
    (() => {
      let q = serviceClient
        .from(TABLES.WATCHLIST_ENTRIES)
        .select('*', { count: 'exact' })
        .eq('merchant_id', resolvedCtx.merchantId)
        .eq('removed_by_merchant', false)
        .order('added_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (searchQuery) {
        q = q.or(
          `display_name.ilike.%${searchQuery}%,display_email.ilike.%${searchQuery}%`,
        );
      }
      return q;
    })(),
    serviceClient
      .from(TABLES.WATCHLIST_ENTRIES)
      .select('customer_profile_id')
      .eq('merchant_id', resolvedCtx.merchantId)
      .eq('removed_by_merchant', false),
    serviceClient
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
      .limit(20),
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

  const allWatchlistedProfileIds = new Set(
    ((allWatchlistIds ?? []) as Array<{ customer_profile_id: string | null }>)
      .map((row) => row.customer_profile_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );

  const totalWatchlisted = allWatchlistedProfileIds.size;

  let appeared30dCount = 0;
  if (allWatchlistedProfileIds.size > 0) {
    const { count: appearanceCount } = await serviceClient
      .from('customer_profile_audit_appearances')
      .select('id', { count: 'exact', head: true })
      .gte('appeared_at', thirtyDaysAgo)
      .in('profile_id', Array.from(allWatchlistedProfileIds));
    appeared30dCount = appearanceCount ?? 0;
  }

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
    (r) => allWatchlistedProfileIds.has(r.profile_id),
  );

  // Distinct watched identities that surfaced in the last 30 days.
  const distinctRecentProfiles = new Set(recentAppearances.map((r) => r.profile_id)).size;

  // Build per-profile score history map (oldest-first, up to 10 snapshots)
  // Used to compute risk trend in the watchlist table.
  const trendScoresMap = new Map<string, number[]>();
  for (const r of ((recentRaw ?? []) as unknown as RecentRow[])) {
    if (!allWatchlistedProfileIds.has(r.profile_id)) continue;
    if (!trendScoresMap.has(r.profile_id)) trendScoresMap.set(r.profile_id, []);
    trendScoresMap.get(r.profile_id)!.push(r.score_at_time);
  }
  // recentRaw is newest-first — reverse so scores are oldest-first for trend calc
  trendScoresMap.forEach((scores, key) => trendScoresMap.set(key, scores.slice().reverse()));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (nextPage: number) =>
    `/watchlist?${new URLSearchParams({ ...querySearchParams, page: String(nextPage), pageSize: String(pageSize) }).toString()}`;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        eyebrow="Identity monitoring"
        title="Watchlist"
        subtitle="Identities you're actively monitoring. We flag them the moment they reappear in new orders, claims, or evidence workflows."
        primaryAction={
          <Link href="/customers">
            <Button size="sm" leadingIcon={<Users className="h-3.5 w-3.5" />}>
              Browse customers
            </Button>
          </Link>
        }
        className="rounded-lg"
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard
          label="Identities monitored"
          value={totalWatchlisted}
          hint={totalWatchlisted > 0 ? 'Active across all sources' : 'Add customers to start monitoring'}
          icon={<Eye className="h-4 w-4" />}
        />
        <MetricCard
          label="Appearances · 30d"
          value={appeared30dCount}
          hint="Times watched identities resurfaced"
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          label="Resurfaced identities · 30d"
          value={distinctRecentProfiles}
          hint={distinctRecentProfiles > 0 ? 'Distinct profiles needing a look' : 'No reappearances yet'}
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
      </div>

      {/* Recent appearances */}
      <SectionCard
        title="Recent appearances"
        description="Watched identities that resurfaced in the last 30 days"
        density="compact"
      >
        {recentAppearances.length === 0 ? (
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
            None of your watched identities have reappeared in the last 30 days. New orders, claims, and audits are checked against this list automatically.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <th className="text-left px-3 py-2 text-overline" style={{ color: 'var(--text-muted)' }}>Customer</th>
                  <th className="text-left px-3 py-2 text-overline" style={{ color: 'var(--text-muted)' }}>Appeared in</th>
                  <th className="text-right px-3 py-2 text-overline" style={{ color: 'var(--text-muted)' }}>Score</th>
                  <th className="text-left px-3 py-2 text-overline" style={{ color: 'var(--text-muted)' }}>Risk</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {recentAppearances.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b transition-colors hover-bg-subtle"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td className="px-3 py-3">
                      <div className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>{r.customer_profiles.names?.[0] ?? '—'}</div>
                      <div className="text-caption" style={{ color: 'var(--text-muted)' }}>{r.customer_profiles.primary_email ?? '—'}</div>
                    </td>
                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(r.processing_jobs.created_at)}
                      <span className="ml-1" style={{ color: 'var(--text-subtle)' }}>({r.processing_jobs.total_rows.toLocaleString()} rows)</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round(r.score_at_time)}</td>
                    <td className="px-3 py-3">
                      <ConfidenceBadge grade={riskLevelToNewGrade(r.customer_profiles.risk_level)} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/customers/${r.profile_id}`}
                        className="text-xs font-semibold hover:underline whitespace-nowrap"
                        style={{ color: 'var(--accent)' }}
                      >
                        Open dossier →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Watchlist roster */}
      {rows.length === 0 ? (
        <SectionCard
          title="Watched identities"
          description={searchQuery ? `Search: "${searchQuery}"` : 'Customers you have added to monitoring'}
          density="compact"
          actions={
            <WatchlistSearchInput defaultValue={searchQuery} />
          }
        >
          <EmptyState
            icon={<Eye className="h-6 w-6" />}
            title={searchQuery ? 'No matching identities' : 'Nothing on your watchlist yet'}
            description={
              searchQuery
                ? `No watched identities match "${searchQuery}".`
                : 'The watchlist keeps a standing eye on customers you care about. Once added, every future order, claim, and evidence workflow is checked against them, and reappearances surface here.'
            }
            action={
              !searchQuery ? (
                <Link href="/customers">
                  <Button size="sm" leadingIcon={<Users className="h-3.5 w-3.5" />}>
                    Browse customers
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <SectionCard
          title="Watched identities"
          description={`${total.toLocaleString()} monitored · checked against every new order, claim, and audit`}
          density="compact"
          actions={
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <WatchlistSearchInput defaultValue={searchQuery} />
              <Suspense fallback={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>Rows…</span>}>
                <PageSizeSelect pathname="/watchlist" pageSize={pageSize} />
              </Suspense>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Page {page} of {totalPages}</span>
                  {page > 1 && (
                    <Link href={pageHref(page - 1)}>
                      <Button variant="secondary" size="sm">Prev</Button>
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={pageHref(page + 1)}>
                      <Button variant="secondary" size="sm">Next</Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          }
        >
          <WatchlistTableClient rows={rows.map((r) => ({
            ...r,
            risk_trend_scores: r.customer_profile_id
              ? (trendScoresMap.get(r.customer_profile_id) ?? [])
              : [],
          }))} />
        </SectionCard>
      )}
    </div>
  );
}
