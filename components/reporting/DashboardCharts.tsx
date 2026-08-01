'use client';

import Link from 'next/link';
import type { DashboardPeriodComparison, IntelligenceReport, MoneyBridge } from '@/lib/reporting/intelligence';
import { financialMetricValue, financialReportRecordsHref } from '@/lib/reporting/intelligence';
import { buildDashboardChartBuckets } from '@/components/dashboard/dashboardModel';
import {
  formatMoney,
  formatMinorCurrencyNullable,
} from '@/lib/utils/format';
import { CumulativeAreaLineChart } from '@/components/charts/authenticated/cartesian/CumulativeAreaLineChart';
import { RankedContributionChart } from '@/components/charts/authenticated/RankedContributionChart';
import {
  ChartFrame,
  ChartLegend,
  ChartState,
  type ChartDataTableModel,
} from '@/components/charts/authenticated/ChartFrame';
import { StageDotPlot, type StageDotPlotRow } from '@/components/charts/authenticated/operational/StageDotPlot';
import ExportMenu from '@/components/reports/ExportMenu';
import {
  buildCumulativeFinancialSeries,
  type CumulativeFinancialPoint,
} from '@/components/reporting/reportChartModel';
import { financialStageLabel } from '@/lib/ui/labels';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';

type CurrencyCharts = {
  bridge: MoneyBridge;
  causes: Array<{ name: string; valueMinor: number; count: number; href: string }>;
  trend: CumulativeFinancialPoint[];
};

function compactMoney(valueMinor: number, currency: string) {
  return formatMinorCurrencyNullable(valueMinor, currency);
}

function conversion(numerator: number | null, denominator: number | null): string | null {
  if (numerator == null || denominator == null || denominator <= 0 || numerator < 0) return null;
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function chartCadenceLabel(range: IntelligenceReport['range']): string {
  if (range === '90d') return 'Cumulative weekly financial value';
  if (range === 'all') return 'Cumulative monthly financial value';
  return 'Cumulative daily financial value';
}

function chartData(
  report: IntelligenceReport,
  comparison: DashboardPeriodComparison | null,
): CurrencyCharts[] {
  return report.bridges.map((bridge) => {
    const exposureBuckets = buildDashboardChartBuckets({
      current: report.trend,
      previous: comparison?.trend,
      range: report.range,
      currency: bridge.currency,
      metric: 'exposure',
      asOf: report.generatedAt,
    });
    const recoveredBuckets = buildDashboardChartBuckets({
      current: report.trend,
      range: report.range,
      currency: bridge.currency,
      metric: 'recovered',
      asOf: report.generatedAt,
    });

    return {
      bridge,
      trend: buildCumulativeFinancialSeries({
        exposure: exposureBuckets,
        recovered: recoveredBuckets,
      }),
      causes: report.causes
        .filter((row) => row.currency === bridge.currency && row.amountMinor > 0)
        .slice(0, 5)
        .map((row) => ({
          name: row.label,
          valueMinor: row.amountMinor,
          count: row.count,
          href: row.href,
        })),
    };
  });
}

export function DashboardCharts({
  report,
  comparison = null,
}: {
  report: IntelligenceReport;
  comparison?: DashboardPeriodComparison | null;
}) {
  const groups = chartData(report, comparison);

  if (!groups.length) {
    return (
      <section className="border-t border-[var(--ua-border-subtle)] pt-5" aria-labelledby="charts-empty-title">
        <h2 id="charts-empty-title" className="text-[length:var(--ua-text-section-title-size)] font-semibold leading-[var(--ua-text-section-title-leading)]">
          Case financials
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ua-text-secondary)]">
          Charts appear once case ledger entries carry an amount and a currency. Nothing in this period does yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-label="Case financial charts">
      {groups.map(({ bridge, trend, causes }) => (
        <div key={bridge.currency} className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--ua-border-subtle)] pb-2">
            <h2 className="text-base font-semibold">Case financials</h2>
            <p className="text-xs font-medium text-[var(--ua-text-secondary)]">
              {bridge.currency} · {TIME_RANGE_LABELS[report.range]}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <ChartFrame
                id={`exposure-recovered-${bridge.currency}`}
                kind="cumulative-financial"
                question="How is financial value accumulating?"
                summary={chartCadenceLabel(report.range)}
                scope={`${bridge.currency} · ${TIME_RANGE_LABELS[report.range]}`}
                control={
                  <ExportMenu
                    range={report.range}
                    timezone={report.timezone}
                    currency={bridge.currency}
                    metric="exposed"
                  />
                }
                legend={<ChartLegend items={[
                  { label: 'Exposure', tone: 'primary' },
                  { label: 'Recovered', tone: 'positive' },
                  ...(comparison ? [{ label: 'Previous exposure', tone: 'comparison' as const }] : []),
                ]} />}
                records={{
                  href: financialReportRecordsHref({
                    range: report.range,
                    currency: bridge.currency,
                    metric: 'exposed',
                    timezone: report.timezone,
                  }),
                  label: 'View exposure records',
                }}
                table={trend.length ? trendTable(bridge.currency, trend) : undefined}
              >
                {trend.some((point) => point.exposureIncrementMinor != null || point.recoveredIncrementMinor != null) ? (
                  <CumulativeAreaLineChart
                    data={trend}
                    valueFormatter={(value) => compactMoney(value, bridge.currency)}
                    tooltipFormatter={(value) => formatMoney(value, bridge.currency)}
                    comparison={Boolean(comparison)}
                    height={340}
                  />
                ) : trend.length ? (
                  <ChartState
                    kind="unavailable"
                    title="Dated values unavailable"
                    description="Dated exposure and recovery values are unavailable for this period."
                  />
                ) : (
                  <ChartState
                    kind="empty"
                    title="No dated entries"
                    description="No dated exposure or recovery entries were recorded in this period."
                  />
                )}
              </ChartFrame>
            </div>

            <div className="self-start xl:col-span-4">
              <RankedContributionChart
                id={`loss-causes-${bridge.currency}`}
                title="Loss causes"
                description="Confirmed loss, ranked by recorded cause"
                items={causes.map((cause) => ({
                  label: cause.name,
                  value: cause.valueMinor,
                  displayValue: compactMoney(cause.valueMinor, bridge.currency),
                  detail: `${cause.count} ${cause.count === 1 ? 'record' : 'records'}`,
                  href: cause.href,
                  tone: 'negative',
                }))}
                compact={causes.length <= 2}
              />
              {causes.length ? (
                <Link href={financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'confirmed_loss', timezone: report.timezone })} className="mt-2 inline-flex text-xs font-semibold text-[var(--ua-action-primary)]">
                  View all causes
                </Link>
              ) : null}
            </div>

            <RecoveryLedger bridge={bridge} report={report} />
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * The cumulative hero carries two series per date, which the single-value
 * `AuthChartTableRow` shape cannot express, so it supplies its own multi-column
 * {@link ChartDataTableModel} to the canonical `ChartFrame` table slot — one
 * accessible table primitive, with no hand-built table markup.
 */
function trendTable(currency: string, trend: CumulativeFinancialPoint[]): ChartDataTableModel {
  return {
    caption: `Cumulative exposure and recovered value by period (${currency})`,
    columns: [
      { key: 'period', header: 'Period' },
      { key: 'exposureAdded', header: 'Exposure added', numeric: true },
      { key: 'exposureToDate', header: 'Exposure to date', numeric: true },
      { key: 'recoveredAdded', header: 'Recovered added', numeric: true },
      { key: 'recoveredToDate', header: 'Recovered to date', numeric: true },
    ],
    rows: trend.map((point) => ({
      key: point.key,
      header: point.label,
      values: [
        point.exposureIncrementMinor == null ? '—' : formatMoney(point.exposureIncrementMinor, currency),
        point.cumulativeExposureMinor == null ? 'Unavailable' : formatMoney(point.cumulativeExposureMinor, currency),
        point.recoveredIncrementMinor == null ? '—' : formatMoney(point.recoveredIncrementMinor, currency),
        point.cumulativeRecoveredMinor == null ? 'Unavailable' : formatMoney(point.cumulativeRecoveredMinor, currency),
      ],
    })),
  };
}

function RecoveryLedger({ bridge, report }: { bridge: MoneyBridge; report: IntelligenceReport }) {
  const exposed = financialMetricValue(bridge, 'exposed');
  const recoverable = financialMetricValue(bridge, 'recoverable');
  const recovered = financialMetricValue(bridge, 'recovered');
  const outstanding = financialMetricValue(bridge, 'outstanding');
  const rows: StageDotPlotRow[] = [
    {
      key: 'exposed',
      label: financialStageLabel('maximum_exposure'),
      value: exposed,
      displayValue: exposed == null ? 'Unavailable' : formatMoney(exposed, bridge.currency),
      detail: 'known exposure',
      tone: 'primary',
      href: financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'exposed', timezone: report.timezone }),
    },
    {
      key: 'recoverable',
      label: financialStageLabel('eligible_recovery'),
      value: recoverable,
      displayValue: recoverable == null ? 'Unavailable' : formatMoney(recoverable, bridge.currency),
      detail: conversion(recoverable, exposed) ? `${conversion(recoverable, exposed)} of exposure` : undefined,
      tone: 'primary',
      href: financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'recoverable', timezone: report.timezone }),
    },
    {
      key: 'recovered',
      label: financialStageLabel('recovered_cash'),
      value: recovered,
      displayValue: recovered == null ? 'Unavailable' : formatMoney(recovered, bridge.currency),
      detail: conversion(recovered, recoverable) ? `${conversion(recovered, recoverable)} of eligible` : undefined,
      tone: 'positive',
      href: financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'recovered', timezone: report.timezone }),
    },
    {
      key: 'outstanding',
      label: financialStageLabel('outstanding_recovery'),
      value: outstanding,
      displayValue: outstanding == null ? 'Unavailable' : formatMoney(outstanding, bridge.currency),
      detail: conversion(outstanding, recoverable) ? `${conversion(outstanding, recoverable)} of eligible` : undefined,
      tone: 'neutral',
      href: financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'outstanding', timezone: report.timezone }),
    },
  ];
  const hasKnownValue = rows.some((row) => row.value != null);

  return (
    <section className="ua-section-panel rounded-[var(--ua-radius-surface)] xl:col-span-12" aria-labelledby={`recovery-ledger-${bridge.currency}`}>
      <div className="border-b border-[var(--ua-border-subtle)] px-4 py-3">
        <h3 id={`recovery-ledger-${bridge.currency}`} className="text-sm font-semibold">How much exposed value is reaching recovery?</h3>
        <p className="mt-0.5 text-xs text-[var(--ua-text-secondary)]">Reconciled value through the recovery workflow</p>
      </div>
      {hasKnownValue ? <StageDotPlot rows={rows} /> : (
        <p className="px-4 py-5 text-sm text-[var(--ua-text-secondary)]">Recovery values are unavailable for this period.</p>
      )}
    </section>
  );
}
