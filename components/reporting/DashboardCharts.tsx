'use client';

import Link from 'next/link';
import type { DashboardPeriodComparison, IntelligenceReport, MoneyBridge } from '@/lib/reporting/intelligence';
import { financialMetricValue, financialReportRecordsHref } from '@/lib/reporting/intelligence';
import { buildDashboardChartBuckets } from '@/components/dashboard/dashboardModel';
import {
  formatDateAbsolute,
  formatMoney,
  formatMinorCurrencyNullable,
} from '@/lib/utils/format';
import { DualLineChart, type DualLinePoint } from '@/components/charts/authenticated/cartesian/DualLineChart';
import { RankedContributionChart } from '@/components/charts/authenticated/RankedContributionChart';
import { ChartLegend } from '@/components/charts/authenticated/ChartPanel';
import dvStyles from '@/components/charts/authenticated/AuthenticatedCharts.module.css';
import { financialStageLabel } from '@/lib/ui/labels';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';

type CurrencyCharts = {
  bridge: MoneyBridge;
  causes: Array<{ name: string; valueMinor: number; count: number; href: string }>;
  trend: Array<{
    key: string;
    date: string;
    label: string;
    exposureMinor: number | null;
    recoveredMinor: number | null;
    previousExposureMinor: number | null;
  }>;
  observations: Array<{ date: string; exposureMinor: number | null; recoveredMinor: number | null }>;
};

function compactMoney(valueMinor: number, currency: string) {
  return formatMinorCurrencyNullable(valueMinor, currency);
}

function conversion(numerator: number | null, denominator: number | null): string | null {
  if (numerator == null || denominator == null || denominator <= 0 || numerator < 0) return null;
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function chartCadenceLabel(range: IntelligenceReport['range']): string {
  if (range === '90d') return 'Weekly ledger value';
  if (range === 'all') return 'Monthly ledger value';
  return 'Daily ledger value';
}

function chartData(
  report: IntelligenceReport,
  comparison: DashboardPeriodComparison | null,
): CurrencyCharts[] {
  return report.bridges.map((bridge) => {
    const observations = report.trend
      .filter((point) => point.currency === bridge.currency)
      .map((point) => ({
        date: point.date,
        exposureMinor: point.knownStates.includes('exposed') ? point.exposureMinor : null,
        recoveredMinor: point.knownStates.includes('recovered') ? point.recoveredMinor : null,
      }));
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
      trend: exposureBuckets.map((bucket, index) => ({
        key: bucket.key,
        date: bucket.key,
        label: bucket.label,
        exposureMinor: bucket.currentMinor,
        recoveredMinor: recoveredBuckets[index]?.currentMinor ?? null,
        previousExposureMinor: bucket.previousMinor,
      })),
      observations,
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
      {groups.map(({ bridge, trend, observations, causes }) => (
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
              title="How is financial exposure changing?"
              description="Exposure, recovery, and the comparable previous period"
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
              {trend.some((point) => point.exposureMinor != null || point.recoveredMinor != null) ? (
                <>
                  {trend.some((point) => point.exposureMinor == null && point.recoveredMinor == null)
                    || observations.some((point) => point.exposureMinor == null || point.recoveredMinor == null) ? (
                    <p className="px-4 pt-2 text-xs text-[var(--ua-text-secondary)]" role="status">
                      Gaps indicate that no reconciled value was recorded for that bucket; they are not zero.
                    </p>
                  ) : null}
                  <div className="px-2 pb-2 pt-1">
                    <DualLineChart
                      data={trend.map<DualLinePoint>((point) => ({
                        key: point.key,
                        label: point.label,
                        exposureMinor: point.exposureMinor,
                        recoveredMinor: point.recoveredMinor,
                        previousExposureMinor: point.previousExposureMinor,
                      }))}
                      series={[
                        { key: 'exposureMinor', label: 'Exposure', colourVar: '--ua-chart-primary', variant: 'primary' },
                        { key: 'recoveredMinor', label: 'Recovered', colourVar: '--ua-success', variant: 'semantic', showDots: true },
                        ...(comparison ? [{
                          key: 'previousExposureMinor',
                          label: 'Previous exposure',
                          colourVar: '--ua-chart-comparison',
                          variant: 'comparison' as const,
                          connectNulls: true,
                        }] : []),
                      ]}
                      valueFormatter={(value) => compactMoney(value, bridge.currency)}
                      height={340}
                    />
                  </div>
                  <ReportChartDataTable currency={bridge.currency} trend={observations} />
                </>
              ) : trend.length ? (
                <>
                  <ChartEmpty message="Dated exposure and recovery values are unavailable for this period." />
                  <ReportChartDataTable currency={bridge.currency} trend={observations} />
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
  const rows = [
    { label: financialStageLabel('maximum_exposure'), state: 'exposed' as const, value: exposed, conversion: null, tone: 'primary' },
    { label: financialStageLabel('eligible_recovery'), state: 'recoverable' as const, value: recoverable, conversion: conversion(recoverable, exposed), tone: 'primary' },
    { label: financialStageLabel('recovered_cash'), state: 'recovered' as const, value: recovered, conversion: conversion(recovered, recoverable), tone: 'positive' },
    { label: financialStageLabel('outstanding_recovery'), state: 'outstanding' as const, value: outstanding, conversion: conversion(outstanding, recoverable), tone: 'neutral' },
  ];
  const hasKnownValue = rows.some((row) => row.value != null);
  // Scale every stage against the first stage that has a known value, so a null
  // exposure does not collapse the whole funnel to zero width.
  const baseline = rows.find((row) => row.value != null)?.value ?? 0;

  return (
    <section className="ua-section-panel rounded-[var(--ua-radius-surface)] xl:col-span-12" aria-labelledby={`recovery-ledger-${bridge.currency}`}>
      <div className="border-b border-[var(--ua-border-subtle)] px-4 py-3">
        <h3 id={`recovery-ledger-${bridge.currency}`} className="text-sm font-semibold">How much exposed value is reaching recovery?</h3>
        <p className="mt-0.5 text-xs text-[var(--ua-text-secondary)]">Reconciled value through the recovery workflow</p>
      </div>
      {hasKnownValue ? <>
        {/*
          A proportional funnel, not three loose numbers. Each stage bar is drawn
          against the first known stage, so the drop-off from exposed to pursued
          to recovered is visible rather than something the reader has to compute.
          Bars use one flat fill on a neutral track (§8.3); the value and the
          stage-to-stage conversion stay in text beside them.
        */}
        <dl className="grid gap-3 p-4">
          {rows.map((row, index) => {
            const share = row.value != null && baseline ? Math.max(1.5, (row.value / baseline) * 100) : 0;
            return (
              <div key={row.label} className="grid grid-cols-[128px_minmax(0,1fr)_auto] items-center gap-3">
                <dt className="text-xs font-medium text-[var(--ua-text-secondary)]">
                  <Link
                    className="hover:text-[var(--ua-action-primary)]"
                    href={financialReportRecordsHref({
                      range: report.range,
                      currency: bridge.currency,
                      metric: row.state,
                      timezone: report.timezone,
                    })}
                  >
                    {row.label}
                  </Link>
                </dt>
                <dd className="min-w-0">
                  <div className="h-3 overflow-hidden rounded-[var(--ua-radius-xs)] bg-[var(--ua-chart-track)]">
                    <div
                      className="h-full rounded-[var(--ua-radius-xs)]"
                      style={{
                        width: `${share}%`,
                        background: row.tone === 'positive'
                          ? 'var(--ua-success)'
                          : row.tone === 'neutral'
                            ? 'var(--ua-chart-neutral-500)'
                            : 'var(--ua-chart-primary)',
                      }}
                    />
                  </div>
                </dd>
                <dd className="flex items-baseline gap-2 whitespace-nowrap">
                  <span className={`text-sm font-semibold tabular-nums ${dvStyles.mono}`}>
                    {row.value == null ? 'Unavailable' : formatMoney(row.value, bridge.currency)}
                  </span>
                  <span className="text-xs text-[var(--ua-text-tertiary)]">
                    {row.value == null
                      ? 'no known value'
                      : row.conversion
                        ? `${row.conversion} of previous`
                        : index === 0
                          ? 'known exposure'
                          : ''}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </> : (
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
  trend: Array<{ date: string; exposureMinor: number | null; recoveredMinor: number | null }>;
}) {
  return (
    <details className="border-t border-[var(--ua-border-subtle)] px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-[var(--ua-text-secondary)]">View chart data</summary>
      <div className="mt-3 max-h-56 overflow-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b border-[var(--ua-border-subtle)] text-left">
              <th className="py-2">Date</th>
              <th className="py-2 text-right">Exposure</th>
              <th className="py-2 text-right">Recovered</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((point) => (
              <tr key={point.date} className="border-b border-[var(--ua-border-subtle)]">
                <th scope="row" className="py-2 text-left font-medium">{formatDateAbsolute(point.date)}</th>
                <td className="py-2 text-right tabular-nums">
                  {point.exposureMinor == null ? 'Unavailable' : formatMoney(point.exposureMinor, currency)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {point.recoveredMinor == null ? 'Unavailable' : formatMoney(point.recoveredMinor, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
