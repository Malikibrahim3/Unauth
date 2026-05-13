import { createClient, createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/utils/format';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import InsightsStrip, { type Insight } from '@/components/dashboard/InsightsStrip';
import EmptyDashboardHero from '@/components/EmptyDashboardHero';
import TrackPageView from '@/components/common/TrackPageView';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Database } from '@/lib/supabase/types';
import { countMerchantReviewQueueProfiles, getExposureAtRisk } from '@/lib/supabase/merchantHelpers';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { FLAG_SAVINGS_CARD } from '@/lib/flags';
import { SavingsCard } from '@/components/dashboard/SavingsCard';
import type { SavingsCardData } from '@/components/dashboard/SavingsCard';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

export default async function DashboardPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  // Resolve authenticated user + merchant context.
  // Dashboard only shows data for the calling merchant — no cross-tenant reads.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  // App Router pages must return React nodes (not Response objects).
  if (denied) {
    return (
      <div className="p-8">
        <h1 className="text-heading-lg">Access denied</h1>
        <p className="text-body-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          You do not have permission to view dashboard analytics.
        </p>
      </div>
    );
  }

  const { data: runs } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('hidden_by_merchant', false)
    .order('created_at', { ascending: false })
    .limit(50);

  const typedRuns = (runs ?? []) as unknown as RunRow[];

  const totalTransactions = typedRuns.reduce((sum, r) => sum + r.total_rows, 0);
  // NOTE: totalFlagged uses STORED processing_jobs.flagged_count — these are the
  // values written by countReviewWorthyTransactions() at job finalisation and may
  // reflect historical import state for older rows.
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

  // LIVE identity review queue — distinct customer profiles with at least one
  // review-worthy, non-dismissed transaction across ALL merchant-owned jobs.
  //
  // Uses the shared countMerchantReviewQueueProfiles() helper which:
  //   - scopes through processing_jobs.merchant_id (not loose profile status)
  //   - applies the canonical review-worthy definition (grade IS NOT NULL OR
  //     status IN candidate/probable/definite, excluding dismissed IS TRUE)
  //   - paginates in 1000-row batches — no Supabase default row cap
  //
  // IMPORTANT: this count is DIFFERENT from totalFlagged above.
  //   totalFlagged  = sum of stored processing_jobs.flagged_count (historical)
  //   reviewQueue   = live distinct customer count with open review signals
  //
  // NULL means the count could not be loaded (helper threw). Render as
  // "Unavailable" — do NOT convert data-access failures into 0.
  let reviewQueue: number | null = null;
  try {
    reviewQueue = await countMerchantReviewQueueProfiles(serviceClient, ctx.merchantId);
  } catch {
    // reviewQueue stays null — rendered as "Unavailable" in the KPI card.
  }

  // Exposure at risk (sum of order_value for review-worthy, non-dismissed transactions)
  // NULL means the helper failed; never converted to 0 (see error policy in merchantHelpers).
  let exposureAtRisk: number | null = null;
  let exposurePrev30d: number | null = null;
  try {
    exposureAtRisk = await getExposureAtRisk(serviceClient, ctx.merchantId);
  } catch {
    // exposureAtRisk stays null
  }

  // Delta vs. previous 30-day window — query restricted to jobs created in [−60d, −30d).
  // We approximate "previous period" by summing order_value for jobs in that window.
  // The computation is best-effort; we never surface a delta if either window fails.
  const now = new Date();
  const prev30Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const prev30End   = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    // Get job IDs for the previous 30-day window
    const { data: prevJobRows } = await serviceClient
      .from('processing_jobs')
      .select('id')
      .eq('merchant_id', ctx.merchantId)
      .gte('created_at', prev30Start)
      .lt('created_at', prev30End);
    if (prevJobRows && prevJobRows.length > 0) {
      const prevJobIds = (prevJobRows as Array<{ id: string }>).map(r => r.id);
      // Graded clause
      const { data: prevGraded } = await serviceClient
        .from('audit_transactions')
        .select('order_value')
        .in('job_id', prevJobIds)
        .not('identity_confidence_grade', 'is', null)
        .not('dismissed_by_merchant', 'is', true) as unknown as { data: Array<{ order_value: string | number | null }> | null };
      // Status-only clause
      const { data: prevStatus } = await serviceClient
        .from('audit_transactions')
        .select('order_value')
        .in('job_id', prevJobIds)
        .in('match_status', ['candidate', 'probable', 'definite'])
        .is('identity_confidence_grade', null)
        .not('dismissed_by_merchant', 'is', true) as unknown as { data: Array<{ order_value: string | number | null }> | null };
      const sum = (rows: Array<{ order_value: string | number | null }> | null) =>
        (rows ?? []).reduce((acc, r) => {
          const v = r.order_value === null || r.order_value === undefined ? 0
            : typeof r.order_value === 'string' ? parseFloat(r.order_value)
            : (r.order_value as number);
          return acc + (isNaN(v) ? 0 : v);
        }, 0);
      exposurePrev30d = sum(prevGraded) + sum(prevStatus);
    }
  } catch {
    // exposurePrev30d stays null — delta will not be shown
  }

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
  const insights: Insight[] = [];

  // Phase E-4 — ROI / SavingsCard data (feature-flagged, conservative methodology)
  let savingsData: SavingsCardData | null = null;
  if (FLAG_SAVINGS_CARD) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: confirmedRows } = await serviceClient
        .from('audit_transactions' as any)
        .select('order_value')
        .in(
          'job_id',
          (
            await serviceClient
              .from('processing_jobs')
              .select('id')
              .eq('merchant_id', ctx.merchantId)
              .gte('created_at', thirtyDaysAgo)
          ).data?.map((r: { id: string }) => r.id) ?? [],
        )
        .or('match_status.eq.confirmed_fraud,match_status.eq.confirmed-fraud,merchant_feedback.eq.fraud');

      const rows = (confirmedRows as Array<{ order_value: string | number | null }> | null) ?? [];
      const confirmedFraudValue = rows.reduce((acc, r) => {
        const v = r.order_value === null ? 0
          : typeof r.order_value === 'string' ? parseFloat(r.order_value)
          : (r.order_value as number);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);

      savingsData = {
        confirmedFraudValue,
        confirmedFraudCount: rows.length,
        currency: 'GBP',
        periodDays: 30,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      // savingsData stays null
    }
  }

  if (unreviewedCount > 0) {
    insights.push({
      text: `${unreviewedCount} watchlisted ${unreviewedCount === 1 ? 'customer' : 'customers'} appeared in your latest audit and need review.`,
      level: 'warn',
      href: '/watchlist',
      cta: 'Review watchlist',
    });
  }
  if (latestFlagRate !== null && prevFlagRate !== null) {
    const delta = latestFlagRate - prevFlagRate;
    if (Math.abs(delta) >= 0.5) {
      insights.push({
        text: `Match rate ${delta > 0 ? 'increased' : 'decreased'} from ${prevFlagRate.toFixed(1)}% to ${latestFlagRate.toFixed(1)}% in the latest upload.`,
        level: delta > 0 ? 'warn' : 'positive',
        href: '/history',
        cta: 'View history',
      });
    }
  }
  if (reviewQueue !== null && reviewQueue > 0) {
    insights.push({
      text: `${reviewQueue} high-confidence ${reviewQueue === 1 ? 'customer is' : 'customers are'} unresolved in the review queue.`,
      level: 'info',
      href: '/customers?risk=high&status=new',
      cta: 'Review now',
    });
  }
  if (ce3Packages > 0) {
    insights.push({
      text: `${ce3Packages} evidence ${ce3Packages === 1 ? 'package' : 'packages'} ${ce3Packages === 1 ? 'is' : 'are'} CE3.0 eligible and ready to submit.`,
      level: 'positive',
      href: '/chargebacks',
      cta: 'View packages',
    });
  }
  if (!isEmpty && typedRuns.length === 1) {
    insights.push({ text: 'Upload a second dataset to compare flag rates over time.', level: 'info', href: '/upload', cta: 'New audit' });
  }

  return (
    <div className="p-6 md:p-8">
      <TrackPageView event="Dashboard Viewed" />

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="mb-[var(--space-5)]">
        <PageHeader
          title="Identity Review Overview"
          subtitle="Monitor identity match signals and review evidence across all your uploads."
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
      {/* ── Hero KPI: Exposure at risk ───────────────────────────────── */}
      {(() => {
        const exposureDelta: { value: number; direction: 'up' | 'down' | 'flat'; tone: 'positive' | 'negative' | 'neutral' } | undefined =
          exposureAtRisk !== null && exposurePrev30d !== null
            ? (() => {
                const diff = exposureAtRisk - exposurePrev30d;
                // Round to 2 dp to avoid floating-point noise
                const rounded = Math.round(diff * 100) / 100;
                return {
                  value: rounded,
                  direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
                  tone: rounded > 0 ? 'negative' : rounded < 0 ? 'positive' : 'neutral',
                };
              })()
            : undefined;
        const exposureFormatted =
          exposureAtRisk === null
            ? 'Unavailable'
            : exposureAtRisk === 0
            ? '£0'
            : `£${exposureAtRisk.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return (
          <div className="col-span-2 md:col-span-4 mb-[var(--space-3)]">
            <MetricCard
              size="hero"
              label="Exposure at risk"
              value={exposureFormatted}
              delta={exposureDelta}
              hint={
                exposureAtRisk === null
                  ? 'Could not be computed'
                  : 'Sum of order value for open, review-worthy transactions'
              }
            />
          </div>
        );
      })()}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-3)] mb-[var(--space-5)]">
        {reviewQueue === null ? (
          <MetricCard label="Customers to review" value="Unavailable" hint="Count could not be loaded" />
        ) : reviewQueue > 0 ? (
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
        <Link href="/history" className="block">
          <MetricCard
            label="Avg match rate"
            value={avgFlagRate !== null ? `${avgFlagRate.toFixed(1)}%` : '—'}
            hint={
              avgFlagRate !== null && avgFlagRate >= 10 ? 'High — investigate upload'
              : avgFlagRate !== null && avgFlagRate >= 4 ? 'Elevated'
              : 'Normal range'
            }
          />
        </Link>
      </div>

      {isEmpty ? (
        <EmptyDashboardHero />
      ) : (
        <>
          {/* ── Latest audit quick-link ─────────────────────────────── */}
          {latestRun && (latestRun.status === 'completed' || latestRun.status === 'complete') && (
            <Link
              href={`/audit/${latestRun.id}`}
              className="flex items-center justify-between rounded-lg px-5 py-5 mb-6 border-l-4 border border-l-[var(--accent-500)] hover:shadow-md transition-shadow group"
              style={{ background: 'var(--accent-soft)', borderColor: 'var(--border-subtle)', borderLeftColor: 'var(--accent-500)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-overline uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Latest audit</p>
                <p className="text-display-md font-mono truncate" style={{ color: 'var(--text)' }}>{latestRun.filename}</p>
                <p className="text-caption mt-1" style={{ color: 'var(--text-subtle)' }}>
                  {latestRun.total_rows.toLocaleString()} transactions · {(latestRun.flagged_count ?? 0).toLocaleString()} matched
                  {latestFlagRate !== null && <span> · {latestFlagRate.toFixed(1)}% flag rate</span>}
                  <span> · {formatDate(latestRun.created_at)}</span>
                </p>
              </div>
              <svg className="w-7 h-7 group-hover:translate-x-1.5 transition-transform flex-shrink-0 ml-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: 'var(--accent-500)' }}>
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
              { href: '/customers?risk=high', label: 'High-confidence matches', desc: 'Review probable & definite matches' },
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

          {/* Phase E-4 — ROI Savings card (feature-flagged) */}
          {FLAG_SAVINGS_CARD && (
            <SavingsCard data={savingsData} className="mb-6" />
          )}

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
