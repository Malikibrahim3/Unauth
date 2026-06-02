import Link from 'next/link';
import TrackPageView from '@/components/common/TrackPageView';
import WeeklyTrendChart from '@/components/charts/WeeklyTrendChart';
import GradeDistBar from '@/components/charts/GradeDistBar';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Badge } from '@/components/ui/Badge';
import { formatDateMode } from '@/lib/utils/format';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { DashboardReachableWidgets } from '@/components/dashboard/DashboardReachableWidgets';
import type { Insight } from '@/components/dashboard/InsightsStrip';
import {
  ShoppingBag,
  Headphones,
  ShieldCheck,
  Users,
  Inbox,
  Eye,
  Upload,
  Activity,
  ArrowRight,
} from 'lucide-react';
import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';
import type { GradeDistEntry } from '@/components/charts/GradeDistBar';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import type { Database } from '@/lib/supabase/types';
import { MetricCard, ModuleCard } from '@/app/(app)/dashboard/DashboardPagePrimitives';
import { DashboardCompletenessBanner } from '@/app/(app)/dashboard/DashboardCompletenessBanner';
import { DashboardSyncRow } from '@/app/(app)/dashboard/DashboardSyncRow';
import { capitalize } from '@/app/(app)/dashboard/dashboardPageUtils';
import {
  dedupeQueueByCustomer,
  gradeFromQueueRow,
  signalList,
  toNumber,
} from '@/app/(app)/dashboard/dashboardPageUtils';
import type { ActivityItem, DashboardConfig, QueueRow } from '@/app/(app)/dashboard/dashboardPageTypes';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

export type DashboardPageCockpitProps = {
  config: DashboardConfig;
  connectionState: ConnectionState;
  setupState: MerchantSetupState;
  kpis: Array<{
    label: string;
    value: string;
    hint?: string;
    incomplete?: boolean;
    icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }>;
  claimTrend: TrendDataPoint[];
  exposureAtRisk: number;
  gradeDist: GradeDistEntry[];
  reviewRows: QueueRow[];
  profileIdByTx: Map<string, string>;
  customerCount: number;
  claimsNeedingAction: number;
  totalPackages: number;
  priorMatchPackages: number;
  watchlistNeedReview: number;
  activity: ActivityItem[];
  recentRuns: RunRow[];
};

export function DashboardPageCockpit(props: DashboardPageCockpitProps) {
  const {
    config,
    connectionState,
    setupState,
    kpis,
    claimTrend,
    exposureAtRisk,
    gradeDist,
    reviewRows,
    profileIdByTx,
    customerCount,
    claimsNeedingAction,
    totalPackages,
    priorMatchPackages,
    watchlistNeedReview,
    activity,
    recentRuns,
  } = props;

  const insights: Insight[] = activity.slice(0, 3).map((item) => ({
    text: item.detail,
    href: item.href,
    level: item.type === 'Claims' ? 'warn' as const : 'info' as const,
  }));

  return (
    <div className="p-4 md:p-6 space-y-5">
      <TrackPageView event="Dashboard Viewed" />

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>Dashboard</h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {config.secondaryCta ? (
            <Link
              href={config.secondaryCta.href}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-caption font-semibold"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--ink-secondary)' }}
            >
              <Upload className="h-3.5 w-3.5" />
              {config.secondaryCta.label}
            </Link>
          ) : null}
          <Link
            href={config.primaryCta.href}
            className="btn-accent inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-caption font-semibold"
          >
            {config.primaryCta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Setup / completeness banner */}
      {config.banner ? <DashboardCompletenessBanner banner={config.banner} primaryCta={config.primaryCta} /> : null}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Trend row — claims over time + exposure snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-lg border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Claims over time</p>
              <p className="text-caption" style={{ color: 'var(--ink-tertiary)' }}>8-week trend from your helpdesk</p>
            </div>
            <Link href="/claims" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>View claims →</Link>
          </div>
          {connectionState.helpdesk && claimTrend.some((pt) => pt.value > 0) ? (
            <WeeklyTrendChart data={claimTrend} color="var(--accent)" primaryLabel="Claims" height={130} />
          ) : (
            <div
              className="flex h-[130px] items-center justify-center rounded-md"
              style={{ background: 'var(--bg-surface-alt)', border: '1px dashed var(--border-default)' }}
            >
              <p className="text-caption text-center px-4" style={{ color: 'var(--ink-tertiary)' }}>
                {connectionState.helpdesk ? 'No claims in the past 8 weeks' : 'Connect your helpdesk to see claim trends'}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg border p-4 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div>
            <p className="text-caption" style={{ color: 'var(--ink-tertiary)' }}>Exposure at risk</p>
            <p className="num font-semibold mt-1" style={{ fontSize: 26, color: exposureAtRisk > 0 ? 'var(--sev-definite)' : 'var(--data-score)' }}>
              {exposureAtRisk > 0 ? formatCurrencyNullable(exposureAtRisk) : '—'}
            </p>
            <p className="text-caption mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
              {exposureAtRisk > 0 ? 'Open claims with amounts' : 'No open claim exposure'}
            </p>
          </div>
          <div>
            <p className="text-caption mb-2" style={{ color: 'var(--ink-tertiary)' }}>Identity grade distribution</p>
            <GradeDistBar grades={gradeDist} />
          </div>
        </section>
      </div>

      {/* Main cockpit grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Attention queue */}
        <section className="rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4" style={{ color: 'var(--ink-tertiary)' }} />
              <div>
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Attention queue</p>
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
                  Customers with linked identities or claim history worth a look
                </p>
              </div>
            </div>
            <Link href="/customers?risk=high&status=new" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              View all →
            </Link>
          </div>

          {reviewRows.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-body-sm font-medium" style={{ color: 'var(--text)' }}>
                {customerCount > 0 ? 'Nothing needs review right now.' : 'No customers monitored yet.'}
              </p>
              <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                {customerCount > 0
                  ? `${customerCount.toLocaleString()} customer profiles monitored. High-confidence matches surface here as analysis runs.`
                  : 'Customer profiles appear once Shopify or an import syncs data.'}
              </p>
              <div className="mt-3 flex items-center justify-center gap-4">
                {customerCount > 0 && (
                  <Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                    Browse customers →
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div>
              {dedupeQueueByCustomer(reviewRows, profileIdByTx).map(({ row, profileId, extraOrders }) => {
                const score = row.identity_score === null ? null : Math.round(row.identity_score);
                const href = profileId ? `/customers/${profileId}` : `/audit/${row.job_id}/transaction/${row.id}`;
                const signalCount = signalList(row).length;
                const networkLinked = signalList(row).some((s) => s.toLowerCase().includes('crossmerchant'));
                return (
                  <Link
                    key={profileId ?? row.id}
                    href={href}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-4 py-3 hover-bg-subtle"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body-sm truncate font-medium" style={{ color: 'var(--text)' }}>
                          {row.customer_name ?? row.customer_email ?? 'Unidentified customer'}
                        </p>
                        <ConfidenceBadge grade={gradeFromQueueRow(row)} score={score ?? undefined} size="sm" />
                        {row.match_status && <Badge size="sm" tone="warning">{row.match_status}</Badge>}
                        {networkLinked && <Badge size="sm" tone="info">Network</Badge>}
                      </div>
                      <p className="text-caption mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                        {row.order_id ?? row.id} · {formatCurrencyNullable(toNumber(row.order_value))}
                      </p>
                      <p className="text-caption mt-1" style={{ color: 'var(--text-subtle)' }}>
                        {extraOrders > 0 ? `+${extraOrders} more order${extraOrders === 1 ? '' : 's'} · ` : ''}
                        {signalCount > 0 ? `${signalCount} signal${signalCount === 1 ? '' : 's'} matched` : 'No signal breakdown'} · {formatDateMode(row.processed_at, 'recent')}
                      </p>
                    </div>
                    <span className="text-caption self-center font-semibold" style={{ color: 'var(--accent)' }}>Open →</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Right rail modules */}
        <aside className="space-y-4">
          <ModuleCard title="Claims needing action" href="/claims" linkLabel="Open claims" icon={Headphones}>
            {connectionState.helpdesk ? (
              <>
                <p className="num font-semibold" style={{ fontSize: 22, color: 'var(--data-score)' }}>
                  {claimsNeedingAction.toLocaleString()}
                </p>
                <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
                  {claimsNeedingAction > 0
                    ? 'Awaiting a decision or evidence. Review before SLA lapses.'
                    : 'No open claims need action right now.'}
                </p>
              </>
            ) : (
              <p className="text-caption" style={{ color: 'var(--warning)' }}>
                Connect your helpdesk to add claim history and surface claims that need a decision.
              </p>
            )}
          </ModuleCard>

          <ModuleCard title="Evidence ready" href="/chargebacks" linkLabel="View all" icon={ShieldCheck}>
            <p className="num font-semibold" style={{ fontSize: 22, color: 'var(--data-score)' }}>
              {totalPackages.toLocaleString()}
            </p>
            <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
              {totalPackages === 0
                ? 'Generate an evidence package from a customer profile when a dispute needs documentation.'
                : priorMatchPackages > 0
                  ? `${priorMatchPackages} include a prior identity match — strongest for disputes.`
                  : 'Export packaged identity evidence for dispute review.'}
            </p>
          </ModuleCard>

          <ModuleCard title="Watchlist appearances" href="/watchlist" linkLabel="Open" icon={Eye}>
            <p className="num font-semibold" style={{ fontSize: 22, color: 'var(--data-score)' }}>
              {watchlistNeedReview.toLocaleString()}
            </p>
            <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
              {watchlistNeedReview > 0
                ? 'Watched identities appeared in new activity — review pending.'
                : 'No new appearances from watched identities.'}
            </p>
          </ModuleCard>

          <ModuleCard title="Sync health" href="/settings/integrations" linkLabel="Manage" icon={Activity}>
            <div className="space-y-2">
              <DashboardSyncRow label="Shopify" connected={connectionState.shopify} icon={ShoppingBag} />
              <DashboardSyncRow
                label={connectionState.helpdeskProvider ? capitalize(connectionState.helpdeskProvider) : 'Helpdesk'}
                connected={connectionState.helpdesk}
                icon={Headphones}
              />
            </div>
          </ModuleCard>

          <ModuleCard title="Recent activity" icon={Activity}>
            {activity.length === 0 ? (
              <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>No recent activity.</p>
            ) : (
              <div className="space-y-2.5">
                {activity.slice(0, 5).map((item, idx) => {
                  const content = (
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                      <span className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>{item.type}</span>
                      <p className="truncate text-caption" style={{ color: 'var(--text)' }}>{item.detail}</p>
                      <span className="text-caption font-mono" style={{ color: 'var(--text-subtle)' }}>{item.time}</span>
                    </div>
                  );
                  return item.href ? (
                    <Link key={`${item.type}-${idx}`} href={item.href} className="block hover:opacity-80">{content}</Link>
                  ) : (
                    <div key={`${item.type}-${idx}`}>{content}</div>
                  );
                })}
              </div>
            )}
          </ModuleCard>

          {/* Secondary: import / backfill summary */}
          <section className="rounded-lg border" style={{ background: 'var(--bg-surface-alt)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" style={{ color: 'var(--ink-tertiary)' }} />
                <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Imports & backfill</p>
              </div>
              <Link href="/history" className="text-caption font-semibold hover:underline" style={{ color: 'var(--ink-tertiary)' }}>
                History →
              </Link>
            </div>
            <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
              {recentRuns.length === 0 ? (
                <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
                  {setupState === 'csv_only'
                    ? 'No imports yet.'
                    : 'No CSV imports — your data is syncing from live sources. CSV is optional for backfills.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentRuns.map((run) => (
                    <Link key={run.id} href={`/audit/${run.id}`} className="block hover:opacity-80">
                      <p className="truncate text-caption font-medium" style={{ color: 'var(--text)' }}>{run.filename}</p>
                      <p className="text-caption font-mono" style={{ color: 'var(--text-muted)' }}>
                        {(run.flagged_count ?? 0).toLocaleString()} flagged · {formatDateMode(run.created_at, 'recent')}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
