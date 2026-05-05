import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';
import { LoadDemoButton } from '@/components/dashboard/LoadDemoButton';
import DeleteAuditButton from '@/components/audit/DeleteAuditButton';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import EmptyDashboardHero from '@/components/EmptyDashboardHero';
import TrackPageView from '@/components/common/TrackPageView';
import type { Database } from '@/lib/supabase/types';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: runs } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('hidden_by_merchant', false)
    .order('created_at', { ascending: false })
    .limit(50);

  const typedRuns = (runs ?? []) as unknown as RunRow[];

  const totalTransactions = typedRuns.reduce((sum, r) => sum + r.total_rows, 0);
  const totalFlagged = typedRuns.reduce((sum, r) => sum + (r.flagged_count ?? 0), 0);
  const avgFlagRate = totalTransactions > 0 ? (totalFlagged / totalTransactions) * 100 : null;

  const isEmpty = typedRuns.length === 0;

  // Evidence packages stats
  const { data: evidenceRows } = await supabase
    .from('evidence_packages' as any)
    .select('ce3_eligible');
  const totalPackages = evidenceRows?.length ?? 0;
  const ce3Packages = (evidenceRows as Array<{ ce3_eligible: boolean }> | null)?.filter(p => p.ce3_eligible).length ?? 0;

  // Unreviewed watchlist appearances
  const { count: unreviewedAppearances } = await supabase
    .from('watchlist_appearances' as any)
    .select('id', { count: 'exact', head: true })
    .is('reviewed_at', null);
  const unreviewedCount = unreviewedAppearances ?? 0;

  return (
    <div className="p-8">
      <TrackPageView event="Dashboard Viewed" />
      {/* Watchlist appearances amber banner */}
      {unreviewedCount > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-lg px-4 py-3 border" style={{ background: 'var(--warning-bg, #fffbeb)', borderColor: 'var(--warning-bd, #fcd34d)' }}>
          <p className="text-body-sm font-medium" style={{ color: 'var(--warning, #92400e)' }}>
            {unreviewedCount} watchlisted {unreviewedCount === 1 ? 'customer' : 'customers'} appeared in your latest audit.
          </p>
          <Link href="/watchlist#recent-appearances" className="text-body-sm font-semibold ml-4 flex-shrink-0 hover:underline" style={{ color: 'var(--warning, #92400e)' }}>
            Review appearances →
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Audit Runs</h1>
        </div>
        <Link
          href="/upload"
          className="btn-accent px-4 py-2 rounded-md text-body-sm font-semibold transition-colors"
        >
          New Audit
        </Link>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Audit Runs', value: typedRuns.length.toLocaleString() },
          { label: 'Transactions Analysed', value: totalTransactions.toLocaleString() },
          { label: 'Flagged', value: totalFlagged.toLocaleString() },
          {
            label: 'Avg Flag Rate',
            value: avgFlagRate !== null ? `${avgFlagRate.toFixed(1)}%` : '—',
            highlight: avgFlagRate !== null && avgFlagRate >= 10 ? 'var(--risk-critical)' : avgFlagRate !== null && avgFlagRate >= 4 ? 'var(--risk-high)' : null,
          },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="rounded-lg px-5 py-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="text-display-md font-mono" style={{ color: highlight ?? 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>



      {/* Evidence packages summary */}
      {totalPackages > 0 && (
        <div className="rounded-lg px-5 py-4 mb-6 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
              <div>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {totalPackages.toLocaleString()} evidence {totalPackages === 1 ? 'package' : 'packages'} generated
                  {ce3Packages > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                      {ce3Packages} CE3.0 eligible
                    </span>
                  )}
                </p>
                <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Visa Compelling Evidence 3.0 packages can be submitted directly to your payment processor during chargeback representment.
                </p>
              </div>
            </div>
            <Link href="/chargebacks" className="text-body-sm font-medium hover:underline flex-shrink-0 ml-4" style={{ color: 'var(--accent)' }}>
              View all →
            </Link>
          </div>
        </div>
      )}

      {/* Most recent audit quick-link */}
      {!isEmpty && typedRuns[0] && (typedRuns[0].status === 'completed' || typedRuns[0].status === 'complete') && (
        <div className="rounded-lg px-5 py-4 mb-6 border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div>
            <p className="text-caption mb-0.5" style={{ color: 'var(--text-muted)' }}>Latest audit</p>
            <p className="text-body-sm font-semibold font-mono truncate max-w-xs" style={{ color: 'var(--text)' }}>{typedRuns[0].filename}</p>
            <p className="text-caption mt-0.5" style={{ color: 'var(--text-subtle)' }}>
              {typedRuns[0].total_rows.toLocaleString()} transactions · {(typedRuns[0].flagged_count ?? 0).toLocaleString()} flagged
              {typedRuns[0].total_rows > 0 && (
                <span> · {(((typedRuns[0].flagged_count ?? 0) / typedRuns[0].total_rows) * 100).toFixed(1)}% flag rate</span>
              )}
            </p>
          </div>
          <Link href={`/audit/${typedRuns[0].id}`} className="text-body-sm font-medium hover:underline flex-shrink-0 ml-4" style={{ color: 'var(--accent)' }}>
            View audit →
          </Link>
        </div>
      )}
      {isEmpty ? (
        <EmptyDashboardHero />
      ) : (
        <>
          {/* Charts — only shown when there are runs */}
          <DashboardCharts runs={typedRuns.map(r => ({
            id: r.id,
            filename: r.filename,
            total_rows: r.total_rows,
            flagged_count: r.flagged_count ?? 0,
            created_at: r.created_at,
          }))} />

          <div className="flex justify-end">
            <Link href="/history" className="text-body-sm font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              View all audits →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
