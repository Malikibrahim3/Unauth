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
import { ChartLegend } from '@/components/charts/authenticated/ChartPanel';
import { StageDotPlot, type StageDotPlotRow } from '@/components/charts/authenticated/operational/StageDotPlot';
import {
  buildCumulativeFinancialSeries,
  type CumulativeFinancialPoint,
} from '@/components/reporting/reportChartModel';
import dvStyles from '@/components/charts/authenticated/AuthenticatedCharts.module.css';
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

          {!report.reconciliation.ok ? (
            <div className="rounded-[var(--ua-radius-control)] border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] px-4 py-3 text-sm text-[var(--ua-warning)]" role="status">
              Some ledger entries could not be reconciled. Valid currency data remains visible; review the reconciliation notice above before using these figures.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ReportChartPanel
              className="xl:col-span-8"
              title="How is financial value accumulating?"
              description={`Cumulative exposure and recovered value · ${TIME_RANGE_LABELS[report.range]} · ${bridge.currency}`}
              titleId={`exposure-recovered-${bridge.currency}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
                <p className="text-xs text-[var(--ua-text-secondary)]">{chartCadenceLabel(report.range)}</p>
                <ChartLegend items={[
                  { label: 'Exposure', tone: 'primary' },
                  { label: 'Recovered', tone: 'positive' },
                  ...(comparison ? [{ label: 'Previous exposure', tone: 'comparison' as const }] : []),
                ]} />
              </div>
              {trend.some((point) => point.exposureIncrementMinor != null || point.recoveredIncrementMinor != null) ? (
                <>
                  <div className="px-2 pb-2 pt-1">
                    <CumulativeAreaLineChart
                      data={trend}
                      valueFormatter={(value) => compactMoney(value, bridge.currency)}
                      tooltipFormatter={(value) => formatMoney(value, bridge.currency)}
                      comparison={Boolean(comparison)}
                      height={340}
                    />
                  </div>
                  <ReportChartDataTable currency={bridge.currency} trend={trend} />
                </>
              ) : trend.length ? (
                <>
                  <ChartEmpty message="Dated exposure and recovery values are unavailable for this period." />
                  <ReportChartDataTable currency={bridge.currency} trend={trend} />
                </>
              ) : (
                <ChartEmpty message="No dated exposure or recovery entries were recorded in this period." />
              )}
            </ReportChartPanel>

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
 * Report chart shell. Named distinctly so it does not shadow the canonical
 * `ChartPanel`, and it consumes that panel's own CSS module classes so there is
 * one panel skin rather than a second hand-rolled one.
 *
 * It keeps a bespoke accessible table (see ReportChartDataTable) because this
 * chart carries two series per date, which the canonical single-value
 * `AuthChartTableRow` contract cannot express without dropping a series.
 */
function ReportChartPanel({
  children,
  className = '',
  title,
  titleId,
  description,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
  titleId: string;
  description?: string;
}) {
  return (
    <section className={`${dvStyles.panel} ${className}`} aria-labelledby={titleId}>
      <header className={dvStyles.panelHeader}>
        <div className={dvStyles.panelHeading}>
          <h2 id={titleId}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center px-5 py-8">
      <p className="max-w-sm text-sm leading-6 text-[var(--ua-text-secondary)]">{message}</p>
    </div>
  );
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

function ReportChartDataTable({
  currency,
  trend,
}: {
  currency: string;
  trend: CumulativeFinancialPoint[];
}) {
  return (
    <details className="border-t border-[var(--ua-border-subtle)] px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-[var(--ua-text-secondary)]">View chart data</summary>
      <div className="mt-3 max-h-56 overflow-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b border-[var(--ua-border-subtle)] text-left">
              <th className="py-2">Period</th>
              <th className="py-2 text-right">Exposure added</th>
              <th className="py-2 text-right">Exposure to date</th>
              <th className="py-2 text-right">Recovered added</th>
              <th className="py-2 text-right">Recovered to date</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((point) => (
              <tr key={point.key} className="border-b border-[var(--ua-border-subtle)]">
                <th scope="row" className="py-2 text-left font-medium">{point.label}</th>
                <td className="py-2 text-right tabular-nums">
                  {point.exposureIncrementMinor == null ? '—' : formatMoney(point.exposureIncrementMinor, currency)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {point.cumulativeExposureMinor == null ? 'Unavailable' : formatMoney(point.cumulativeExposureMinor, currency)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {point.recoveredIncrementMinor == null ? '—' : formatMoney(point.recoveredIncrementMinor, currency)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {point.cumulativeRecoveredMinor == null ? 'Unavailable' : formatMoney(point.cumulativeRecoveredMinor, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
