import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ConfidenceBadge, riskLevelToNewGrade } from '@/components/ui/ConfidenceBadge';
import WatchlistTableClient from '@/components/watchlist/WatchlistTableClient';
import { formatDate } from '@/lib/utils/format';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import { PageHeader } from '@/components/common/PageHeader';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

export default async function WatchlistPage({ searchParams }: { searchParams?: { page?: string; pageSize?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  // Fetch watchlist entries and recent appearances in parallel
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10));
  const requestedPageSize = parseInt(searchParams?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const querySearchParams = searchParams ?? {};

  const [{ data: entries, count }, { data: recentRaw }] = await Promise.all([
    supabase
      .from('watchlist_entries')
      .select('*', { count: 'exact' })
      .eq('merchant_id', user!.id)
      .eq('removed_by_merchant', false)
      .order('added_at', { ascending: false })
      .range(offset, offset + pageSize - 1),
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
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-8 space-y-6">
      <PageHeader title="Watchlist" subtitle="Customers you're monitoring across future audits." />

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
        <div className="rounded-lg p-10 max-w-lg border" style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}>
          <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Your watchlist is empty. Star any customer on an audit to keep an eye on them &mdash;
            they&apos;ll appear here with their latest risk level every time you upload new orders.
          </p>
          <Link href="/upload" className="mt-4 inline-block text-body-sm font-semibold underline underline-offset-2" style={{ color: 'var(--text)' }}>
            Upload an audit →
          </Link>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>All watchlisted customers</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <PageSizeSelect pathname="/watchlist" searchParams={querySearchParams} pageSize={pageSize} />
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
          <WatchlistTableClient rows={rows} />
        </div>
      )}
    </div>
  );
}
