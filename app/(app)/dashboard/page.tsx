import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import InsightsStrip from '@/components/dashboard/InsightsStrip';
import EmptyDashboardHero from '@/components/EmptyDashboardHero';
import TrackPageView from '@/components/common/TrackPageView';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Database } from '@/lib/supabase/types';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
}

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

  // Customer profile stats (for review queue KPIs)
  const { count: customersNeedingReview } = await supabase
    .from('customer_profiles')
    .select('id', { count: 'exact', head: true })
    .in('investigation_status', ['new', 'in_review'])
    .in('risk_level', ['high', 'critical']);
  const reviewQueue = customersNeedingReview ?? 0;

  // Estimated exposure from latest run
  const latestRun = typedRuns[0] ?? null;
  const latestFlagRate = latestRun && latestRun.total_rows > 0
    ? ((latestRun.flagged_count ?? 0) / latestRun.total_rows) * 100
    : null;
  const prevRun = typedRuns[1] ?? null;
  const prevFlagRate = prevRun && prevRun.total_rows > 0
    ? ((prevRun.flagged_count ?? 0) / prevRun.total_rows) * 100
    : null;

  // Build contextual insights
  const insights: Array<{ text: string; level?: 'info' | 'warn' | 'positive' }> = [];

  if (unreviewedCount > 0) {
    insights.push({
      text: `${unreviewedCount} watchlisted ${unreviewedCount === 1 ? 'customer' : 'customers'} appeared in your latest audit and need review.`,
      level: 'warn',
    });
  }
  if (latestFlagRate !== null && prevFlagRate !== null) {
    const delta = latestFlagRate - prevFlagRate;
    if (Math.abs(delta) >= 0.5) {
      insights.push({
        text: `Flagged rate ${delta > 0 ? 'increased' : 'decreased'} from ${prevFlagRate.toFixed(1)}% to ${latestFlagRate.toFixed(1)}% in the latest upload.`,
        level: delta > 0 ? 'warn' : 'positive',
      });
    }
  }
  if (reviewQueue > 0) {
    insights.push({
      text: `${reviewQueue} high-confidence ${reviewQueue === 1 ? 'customer is' : 'customers are'} unresolved in the review queue.`,
      level: 'info',
    });
  }
  if (ce3Packages > 0) {
    insights.push({
      text: `${ce3Packages} evidence ${ce3Packages === 1 ? 'package' : 'packages'} ${ce3Packages === 1 ? 'is' : 'are'} CE3.0 eligible and ready to submit.`,
      level: 'positive',
    });
  }
  if (!isEmpty && typedRuns.length === 1) {
    insights.push({ text: 'Upload a second dataset to compare flag rates over time.', level: 'info' });
  }

  return (
    <div className="p-6 md:p-8">
      <TrackPageView event="Dashboard Viewed" />

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="mb-[var(--space-5)]">
        <PageHeader
          title="Risk Overview"
          subtitle="Monitor, segment, and act on fraud risk across all your uploads."
          primaryAction={
            <Link href="/upload" className="btn-accent px-4 py-2 rounded-md text-body-sm font-semibold transition-colors">
              New Audit
            </Link>
          }
        />
      </div>

      {/* ── Insights strip ───────────────────────────────────────────── */}
      <InsightsStrip insights={insights} />

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-3)] mb-[var(--space-5)]">
        {reviewQueue > 0 ? (
          <Link href="/customers?risk=high&status=new" className="block">
            <MetricCard label="Customers to review" value={reviewQueue.toLocaleString()} hint="High-confidence, unresolved" />
          </Link>
        ) : (
          <MetricCard label="Customers to review" value="—" hint="All resolved" />
        )}
        <Link href="/history" className="block">
          <MetricCard
            label="Transactions analysed"
            value={totalTransactions.toLocaleString()}
            hint={`${typedRuns.length} audit ${typedRuns.length === 1 ? 'run' : 'runs'}`}
          />
        </Link>
        {totalPackages > 0 ? (
          <Link href="/chargebacks" className="block">
            <MetricCard
              label="Evidence packages"
              value={totalPackages.toLocaleString()}
              hint={ce3Packages > 0 ? `${ce3Packages} CE3.0 eligible` : 'None CE3.0 eligible'}
            />
          </Link>
        ) : (
          <MetricCard label="Evidence packages" value="0" hint="None CE3.0 eligible" />
        )}
        <MetricCard
          label="Avg flag rate"
          value={avgFlagRate !== null ? `${avgFlagRate.toFixed(1)}%` : '—'}
          hint={
            avgFlagRate !== null && avgFlagRate >= 10 ? 'High — investigate upload'
            : avgFlagRate !== null && avgFlagRate >= 4 ? 'Elevated'
            : 'Normal range'
          }
        />
      </div>

      {isEmpty ? (
        <EmptyDashboardHero />
      ) : (
        <>
          {/* ── Latest audit quick-link ─────────────────────────────── */}
          {latestRun && (latestRun.status === 'completed' || latestRun.status === 'complete') && (
            <Link
              href={`/audit/${latestRun.id}`}
              className="flex items-center justify-between rounded-lg px-5 py-4 mb-6 border hover:shadow-sm transition-shadow group"
              style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}
            >
              <div>
                <p className="text-caption mb-0.5" style={{ color: 'var(--text-muted)' }}>Latest audit</p>
                <p className="text-body-sm font-semibold font-mono truncate max-w-xs" style={{ color: 'var(--text)' }}>{latestRun.filename}</p>
                <p className="text-caption mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                  {latestRun.total_rows.toLocaleString()} transactions · {(latestRun.flagged_count ?? 0).toLocaleString()} flagged
                  {latestFlagRate !== null && <span> · {latestFlagRate.toFixed(1)}% flag rate</span>}
                  <span> · {formatDate(latestRun.created_at)}</span>
                </p>
              </div>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: 'var(--icon-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}

          {/* ── Charts ──────────────────────────────────────────────── */}
          <DashboardCharts runs={typedRuns.map(r => ({
            id: r.id,
            filename: r.filename,
            total_rows: r.total_rows,
            flagged_count: r.flagged_count ?? 0,
            created_at: r.created_at,
          }))} />

          {/* ── Quick links row ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { href: '/customers?risk=high', label: 'High-confidence customers', desc: 'Review probable & definite matches' },
              { href: '/customers?hasRefunds=1', label: 'Refund claimants', desc: 'Customers with at least one refund claim' },
              { href: '/chargebacks', label: 'Evidence packages', desc: 'View generated dispute packages' },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-4 py-3 border flex items-start justify-between gap-2 group hover:shadow-sm transition-shadow"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <div>
                  <p className="text-body-sm font-medium" style={{ color: 'var(--text)' }}>{label}</p>
                  <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-70 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            ))}
          </div>

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
