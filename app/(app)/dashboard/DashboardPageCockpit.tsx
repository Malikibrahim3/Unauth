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
  Search,
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
    activity,
    recentRuns,
  } = props;

  const insights: Insight[] = activity.slice(0, 3).map((item) => ({
    text: item.detail,
    href: item.href,
    level: item.type === 'Claims' ? 'warn' as const : 'info' as const,
  }));
  const totalClaimValueReviewed = exposureAtRisk;
  const matchValueLabel = priorMatchPackages > 0
    ? `${priorMatchPackages.toLocaleString()} package${priorMatchPackages === 1 ? '' : 's'} with a prior identity match`
    : 'No matched claim value yet';

  return (
    <div className="space-y-4 p-4 md:p-6">
      <TrackPageView event="Dashboard Viewed" />

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Claim overview</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {config.secondaryCta ? (
            <Link
              href={config.secondaryCta.href}
              className="inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-2 text-sm font-medium"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <Upload className="h-3.5 w-3.5" />
              {config.secondaryCta.label}
            </Link>
          ) : null}
          <Link
            href={config.primaryCta.href}
            className="inline-flex items-center gap-1.5 rounded-[6px] px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {config.primaryCta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Setup / completeness banner */}
      {config.banner ? <DashboardCompletenessBanner banner={config.banner} primaryCta={config.primaryCta} /> : null}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <section className="rounded-[10px] border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Intelligence impact</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>What Unauth surfaced in the selected period</p>
          </div>
          <Link
            href="/reports"
            className="text-xs font-semibold hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Export current view <ArrowRight className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[6px] border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total claim value reviewed</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrencyNullable(totalClaimValueReviewed || null)}</p>
          </div>
          <div className="rounded-[6px] border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Claim value with a cross-merchant match</p>
            <p className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>{matchValueLabel}</p>
          </div>
          <div className="rounded-[6px] border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Merchant response breakdown</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-primary)' }}>
              Responses are recorded on each claim and roll up here once merchants stamp them.
            </p>
          </div>
        </div>
      </section>

      {/* Trend row — claims over time + exposure snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-[10px] border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Claims over time</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>8-week trend from your helpdesk</p>
            </div>
            <Link href="/claims" className="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              View claims <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          {connectionState.helpdesk && claimTrend.some((pt) => pt.value > 0) ? (
            <WeeklyTrendChart data={claimTrend} color="var(--accent)" primaryLabel="Claims" height={130} />
          ) : (
            <div
              className="flex h-[130px] items-center justify-center rounded-[6px]"
              style={{ background: 'var(--surface-sunken)', border: '1px dashed var(--border)' }}
            >
              <p className="text-xs text-center px-4" style={{ color: 'var(--text-tertiary)' }}>
                {connectionState.helpdesk ? 'No claims in the past 8 weeks' : 'Connect your helpdesk to see claim trends'}
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-[10px] border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Open claim value</p>
            <p className="text-xl font-semibold tabular-nums mt-1" style={{ color: exposureAtRisk > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
              {exposureAtRisk > 0 ? formatCurrencyNullable(exposureAtRisk) : '—'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {exposureAtRisk > 0 ? 'Total amount on open claims' : 'No open claim value'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>Identity grade distribution</p>
            <GradeDistBar grades={gradeDist} />
          </div>
        </section>
      </div>

      {/* Main cockpit grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Attention queue */}
        <section className="rounded-[10px] border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Claim intelligence</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Customers with prior claims or repeat patterns — high-confidence identity matches surface here
                </p>
              </div>
            </div>
            <Link href="/customers?risk=high&status=new" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              View all <ArrowRight className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
            </Link>
          </div>

          {reviewRows.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {customerCount > 0 ? 'Nothing needs review right now.' : 'No customers monitored yet.'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {customerCount > 0
                  ? `${customerCount.toLocaleString()} customer profiles monitored. High-confidence matches surface here as analysis runs.`
                  : 'Customer profiles appear once Shopify or an import syncs data.'}
              </p>
              <div className="mt-3 flex items-center justify-center gap-4">
                {customerCount > 0 && (
                  <Link href="/customers" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                    Browse customers <ArrowRight className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
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
                const grade = gradeFromQueueRow(row);
                const nextAction =
                  networkLinked ? 'Review network signals' :
                  grade === 'A' || grade === 'B' ? 'Review dossier' :
                  signalCount > 0 ? 'Inspect signals' :
                  'View profile';
                return (
                  <Link
                    key={profileId ?? row.id}
                    href={href}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-4 py-3 transition-colors"
                    style={{ borderColor: 'var(--border-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-sunken)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                          {row.customer_name ?? row.customer_email ?? 'Unidentified customer'}
                        </p>
                        <ConfidenceBadge grade={grade} score={score ?? undefined} size="sm" />
                        {row.match_status && <Badge size="sm" tone="warning">{row.match_status}</Badge>}
                        {networkLinked && <Badge size="sm" tone="info">Network</Badge>}
                      </div>
                      <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {row.order_id ?? row.id} · {formatCurrencyNullable(toNumber(row.order_value))}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        {extraOrders > 0 ? `+${extraOrders} more order${extraOrders === 1 ? '' : 's'} · ` : ''}
                        {signalCount > 0 ? `${signalCount} signal${signalCount === 1 ? '' : 's'} matched` : 'No signal breakdown'} · {formatDateMode(row.processed_at, 'recent')}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs self-center font-semibold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                      {nextAction} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Right rail modules */}
        <aside className="space-y-4">
          <ModuleCard title="Open claims" href="/claims" linkLabel="View claim index" icon={ShieldCheck}>
            {(connectionState.helpdesk || claimsNeedingAction > 0) ? (
              <>
                <p className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {claimsNeedingAction.toLocaleString()}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {claimsNeedingAction > 0
                    ? 'Open claim records with identity evidence available.'
                    : 'No open claim records right now.'}
                </p>
              </>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Connect your helpdesk to add claim history and surface claims that need a decision.
              </p>
            )}
          </ModuleCard>

          {totalPackages > 0 && (
            <ModuleCard title="Dispute evidence" href="/chargebacks" linkLabel="View packages" icon={ShieldCheck}>
              <p className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {totalPackages.toLocaleString()}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {priorMatchPackages > 0
                  ? `${priorMatchPackages} include a prior identity match — strongest for dispute documentation.`
                  : 'Evidence packages ready for dispute documentation.'}
              </p>
            </ModuleCard>
          )}

          <ModuleCard title="Sync health" href="/settings/integrations" linkLabel="Manage" icon={Activity}>
            <div className="space-y-2">
              <DashboardSyncRow
                label="Shopify"
                connected={connectionState.shopify}
                icon={ShoppingBag}
                hasData={customerCount > 0 || recentRuns.length > 0}
              />
              <DashboardSyncRow
                label={connectionState.helpdeskProvider ? capitalize(connectionState.helpdeskProvider) : 'Helpdesk'}
                connected={connectionState.helpdesk}
                icon={Headphones}
                hasData={claimsNeedingAction > 0}
              />
            </div>
          </ModuleCard>

          <ModuleCard title="Recent activity" icon={Activity}>
            {activity.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No recent activity.</p>
            ) : (
              <div className="space-y-2.5">
                {activity.slice(0, 5).map((item, idx) => {
                  const content = (
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{item.type}</span>
                      <p className="truncate text-xs" style={{ color: 'var(--text-primary)' }}>{item.detail}</p>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{item.time}</span>
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
          <section className="rounded-[10px] border" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Imports & backfill</p>
              </div>
              <Link href="/history" className="text-xs font-semibold hover:underline" style={{ color: 'var(--text-tertiary)' }}>
                History <ArrowRight className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
              </Link>
            </div>
            <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--border-muted)' }}>
              {recentRuns.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {setupState === 'csv_only'
                    ? 'No imports yet.'
                    : 'No CSV imports — your data is syncing from live sources. CSV is optional for backfills.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentRuns.map((run) => (
                    <Link key={run.id} href={`/audit/${run.id}`} className="block hover:opacity-80">
                      <p className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{run.filename}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
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
