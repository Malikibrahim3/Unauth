import Link from 'next/link';
import TrackPageView from '@/components/common/TrackPageView';
import WeeklyTrendChart from '@/components/charts/WeeklyTrendChart';
import { formatCurrencyNullable } from '@/lib/utils/format';
import {
  ShoppingBag,
  Headphones,
  ArrowRight,
  Upload,
  Repeat2,
} from 'lucide-react';
import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';
import { EvidenceLine, PanelCard, uiTokens } from '@/components/ui';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import type { PayoutDashboardMetrics } from '@/lib/dashboard/payoutDashboardMetrics';
import { MetricCard } from '@/app/(app)/dashboard/DashboardPagePrimitives';
import { DashboardSyncRow } from '@/app/(app)/dashboard/DashboardSyncRow';
import { capitalize } from '@/app/(app)/dashboard/dashboardPageUtils';
import type { ActivityItem, DashboardConfig } from '@/app/(app)/dashboard/dashboardPageTypes';
import SetupSummaryCard from '@/components/Onboarding/SetupSummaryCard';

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
  metrics: PayoutDashboardMetrics;
  claimsNeedingAction: number;
  activity: ActivityItem[];
};

export function DashboardPageCockpit(props: DashboardPageCockpitProps) {
  const {
    config,
    connectionState,
    kpis,
    claimTrend,
    metrics,
    claimsNeedingAction,
    activity,
  } = props;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <TrackPageView event="Dashboard Viewed" />

      <SetupSummaryCard />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-display-md font-semibold" style={{ color: 'var(--text-primary)' }}>Payout overview</h1>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <PanelCard as="section" variant="app" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Payout and recovery results</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Operational outcomes from support payouts and recovery cases</p>
          </div>
          <Link href="/reports" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            View analytics <ArrowRight className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PanelCard variant="appInset" className="p-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Open payout exposure</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrencyNullable(metrics.payoutExposureOpen || null, metrics.displayCurrency)}</p>
          </PanelCard>
          <PanelCard variant="appInset" className="p-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Recoverable amount identified</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrencyNullable(metrics.recoverableIdentified || null, metrics.displayCurrency)}</p>
          </PanelCard>
          <PanelCard variant="appInset" className="p-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Amount recovered</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrencyNullable(metrics.amountRecovered || null, metrics.displayCurrency)}</p>
          </PanelCard>
          <PanelCard variant="appInset" className="p-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Recovery cases chase due</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{metrics.chaseDue > 0 ? metrics.chaseDue.toLocaleString() : '—'}</p>
          </PanelCard>
          <PanelCard variant="appInset" className="p-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Rejected / unrecoverable</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrencyNullable(metrics.rejectedUnrecoverableAmount || null, metrics.displayCurrency)}</p>
          </PanelCard>
          <PanelCard variant="appInset" className="p-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Prevention-only exposure</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrencyNullable(metrics.preventionOnlyExposure || null, metrics.displayCurrency)}</p>
          </PanelCard>
          <PanelCard variant="appInset" className="p-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Policy leakage</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrencyNullable(metrics.policyLeakageExposure || null, metrics.displayCurrency)}</p>
          </PanelCard>
          <PanelCard variant="appInset" className="p-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Cases missing evidence</p>
            <p className="mt-1 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{metrics.casesMissingEvidence > 0 ? metrics.casesMissingEvidence.toLocaleString() : '—'}</p>
          </PanelCard>
        </div>
        {metrics.topLossOwners.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Top likely loss owners (open cases)</p>
            <div className="space-y-1.5">
              {metrics.topLossOwners.map((row) => (
                <div key={row.owner} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-primary)' }}>{row.label}</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {row.count} case{row.count === 1 ? '' : 's'} · {formatCurrencyNullable(row.exposure || null, metrics.displayCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </PanelCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PanelCard as="section" variant="app" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Support payout cases over time</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>8-week trend from your helpdesk</p>
            </div>
            <Link href="/claims" className="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Payout control <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          {claimTrend.some((pt) => pt.value > 0) ? (
            <WeeklyTrendChart data={claimTrend} color="var(--accent)" primaryLabel="Cases" height={130} />
          ) : (
            <div
              className="flex h-[130px] items-center justify-center rounded-[6px]"
              style={{ background: 'var(--surface-sunken)', border: '1px dashed var(--border)' }}
            >
              <p className="text-xs text-center px-4" style={{ color: 'var(--text-tertiary)' }}>
                {connectionState.helpdesk ? 'No payout cases in the past 8 weeks' : 'Connect your helpdesk to see payout case trends'}
              </p>
            </div>
          )}
        </PanelCard>

        <aside className="space-y-4">
          <PanelCard as="section" variant="app" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Needs attention</p>
              <Link href="/claims" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Open queue</Link>
            </div>
            <p className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {claimsNeedingAction > 0 ? claimsNeedingAction.toLocaleString() : '—'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Open payout cases awaiting evidence, review, or outcome
            </p>
            <Link
              href="/recoveries"
              className="mt-4 flex items-center justify-between rounded-[6px] border px-3 py-2 text-xs"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                <Repeat2 className="inline h-3.5 w-3.5 mr-1 align-[-2px]" />
                {metrics.recoveryCasesOpen > 0 ? `${metrics.recoveryCasesOpen} recovery case${metrics.recoveryCasesOpen === 1 ? '' : 's'} open` : 'No open recovery cases'}
              </span>
              <ArrowRight className="h-3 w-3" style={{ color: 'var(--accent)' }} />
            </Link>
          </PanelCard>

          <PanelCard as="section" variant="app" className="p-4">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Sync health</p>
            <div className="space-y-2">
              <DashboardSyncRow
                label="Shopify"
                connected={connectionState.shopify}
                icon={ShoppingBag}
                hasData={connectionState.shopify}
              />
              <DashboardSyncRow
                label={connectionState.helpdeskProvider ? capitalize(connectionState.helpdeskProvider) : 'Helpdesk'}
                connected={connectionState.helpdesk}
                icon={Headphones}
                hasData={connectionState.helpdesk}
              />
            </div>
          </PanelCard>

          {activity.length > 0 ? (
            <PanelCard as="section" variant="app" className="p-4">
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Open follow-ups</p>
              <div className="space-y-2.5">
                {activity.map((item, idx) => {
                  const content = (
                    <EvidenceLine
                      icon="confirmed"
                      text={<><span className="font-semibold text-[var(--text-secondary)]">{item.type}</span> · {item.detail}</>}
                      timestamp={item.time || '→'}
                      className={uiTokens.app.caption}
                    />
                  );
                  return item.href ? (
                    <Link key={`${item.type}-${idx}`} href={item.href} className="block hover:opacity-80">{content}</Link>
                  ) : (
                    <div key={`${item.type}-${idx}`}>{content}</div>
                  );
                })}
              </div>
            </PanelCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
