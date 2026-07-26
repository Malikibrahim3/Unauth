'use client';

import Link from 'next/link';
import type { IntelligenceReport, MoneyBridge } from '@/lib/reporting/intelligence';
import { financialMetricValue, financialReportRecordsHref } from '@/lib/reporting/intelligence';
import {
  formatCurrencyCompact,
  formatDateAbsolute,
  formatMoney,
} from '@/lib/utils/format';
import { DualLineChart, type DualLinePoint } from '@/components/charts/authenticated/cartesian/DualLineChart';
import { RankedContributionChart } from '@/components/charts/authenticated/RankedContributionChart';
import { ChartLegend } from '@/components/charts/authenticated/ChartPanel';
import dvStyles from '@/components/charts/authenticated/AuthenticatedCharts.module.css';

type CurrencyCharts = {
  bridge: MoneyBridge;
  causes: Array<{ name: string; valueMinor: number }>;
  trend: Array<{ date: string; exposureMinor: number | null; recoveredMinor: number | null }>;
};

function compactMoney(valueMinor: number, currency: string) {
  return formatCurrencyCompact(valueMinor / 100, currency);
}

function conversion(numerator: number | null, denominator: number | null): string | null {
  if (numerator == null || denominator == null || denominator <= 0 || numerator < 0) return null;
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function chartData(report: IntelligenceReport): CurrencyCharts[] {
  return report.bridges.map((bridge) => ({
    bridge,
    trend: report.trend
      .filter((point) => point.currency === bridge.currency)
      .map((point) => ({
        date: point.date,
        exposureMinor: point.knownStates.includes('exposed') ? point.exposureMinor : null,
        recoveredMinor: point.knownStates.includes('recovered') ? point.recoveredMinor : null,
      })),
    causes: report.causes
      .filter((row) => row.currency === bridge.currency && row.amountMinor > 0)
      .slice(0, 5)
      .map((row) => ({ name: row.label, valueMinor: row.amountMinor })),
  }));
}

export function DashboardCharts({ report }: { report: IntelligenceReport }) {
  const groups = chartData(report);

  if (!groups.length) {
    return (
      <section className="border-t border-[var(--ua-border-subtle)] pt-5" aria-labelledby="charts-empty-title">
        <h2 id="charts-empty-title" className="text-[length:var(--ua-text-section-title-size)] font-semibold leading-[var(--ua-text-section-title-leading)]">
          Payout performance
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ua-text-secondary)]">
          Charts appear once case ledger entries carry an amount and a currency. Nothing in this period does yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-label="Payout performance charts">
      {groups.map(({ bridge, trend, causes }) => (
        <div key={bridge.currency} className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--ua-border-subtle)] pb-2">
            <h2 className="text-base font-semibold">Payout performance</h2>
            <p className="text-xs font-medium text-[var(--ua-text-secondary)]">
              {bridge.currency} · {report.range === 'all' ? 'All time' : `Last ${report.range}`}
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
              title="Exposure and recovered"
              titleId={`exposure-recovered-${bridge.currency}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
                <p className="text-xs text-[var(--ua-text-secondary)]">Daily ledger value</p>
                <ChartLegend items={[{ label: 'Exposure', tone: 'primary' }, { label: 'Recovered', tone: 'positive' }]} />
              </div>
              {trend.some((point) => point.exposureMinor != null || point.recoveredMinor != null) ? (
                <>
                  {trend.some((point) => point.exposureMinor == null || point.recoveredMinor == null) ? (
                    <p className="px-4 pt-2 text-xs text-[var(--ua-text-secondary)]" role="status">
                      Unavailable daily values are shown as gaps, not zero.
                    </p>
                  ) : null}
                  <div className="px-2 pb-2 pt-1">
                    <DualLineChart
                      data={trend.map<DualLinePoint>((point) => ({
                        key: point.date,
                        label: formatDateAbsolute(point.date),
                        exposureMinor: point.exposureMinor,
                        recoveredMinor: point.recoveredMinor,
                      }))}
                      series={[
                        { key: 'exposureMinor', label: 'Exposure', colourVar: '--ua-chart-1' },
                        { key: 'recoveredMinor', label: 'Recovered', colourVar: '--ua-chart-2' },
                      ]}
                      valueFormatter={(value) => compactMoney(value, bridge.currency)}
                      height={260}
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

            <div className="xl:col-span-4">
              <RankedContributionChart
                id={`loss-causes-${bridge.currency}`}
                title="Loss causes"
                description="Confirmed loss, ranked by recorded cause"
                items={causes.map((cause) => ({
                  label: cause.name,
                  value: cause.valueMinor,
                  displayValue: compactMoney(cause.valueMinor, bridge.currency),
                  tone: 'negative',
                }))}
              />
              {causes.length ? (
                <Link href={financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'confirmed_loss', timezone: report.timezone })} className="mt-2 inline-flex text-xs font-semibold text-[var(--ua-action-primary)]">
                  View all causes
                </Link>
              ) : null}
            </div>

            <RecoveryLedger bridge={bridge} />
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
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
  titleId: string;
}) {
  return (
    <section className={`${dvStyles.panel} ${className}`} aria-labelledby={titleId}>
      <header className={dvStyles.panelHeader}>
        <div className={dvStyles.panelHeading}>
          <h2 id={titleId}>{title}</h2>
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

function RecoveryLedger({ bridge }: { bridge: MoneyBridge }) {
  const exposed = financialMetricValue(bridge, 'exposed');
  const recoverable = financialMetricValue(bridge, 'recoverable');
  const recovered = financialMetricValue(bridge, 'recovered');
  const rows = [
    { label: 'Exposed', value: exposed, conversion: null },
    { label: 'Pursued', value: recoverable, conversion: conversion(recoverable, exposed) },
    { label: 'Recovered', value: recovered, conversion: conversion(recovered, recoverable) },
  ];
  const hasKnownValue = rows.some((row) => row.value != null);

  return (
    <section className="ua-section-panel rounded-[var(--ua-radius-surface)] xl:col-span-12" aria-labelledby={`recovery-ledger-${bridge.currency}`}>
      <div className="border-b border-[var(--ua-border-subtle)] px-4 py-3">
        <h3 id={`recovery-ledger-${bridge.currency}`} className="text-sm font-semibold">Recovery progression</h3>
        <p className="mt-0.5 text-xs text-[var(--ua-text-secondary)]">Reconciled value through the recovery workflow</p>
      </div>
      {hasKnownValue ? <dl className="grid sm:grid-cols-3">
        {rows.map((row, index) => (
          <div key={row.label} className={`p-4 ${index > 0 ? 'border-t border-[var(--ua-border-subtle)] sm:border-l sm:border-t-0' : ''}`}>
            <dt className="text-xs font-medium text-[var(--ua-text-secondary)]">{row.label}</dt>
            <dd className={`mt-1 text-xl font-semibold ${dvStyles.mono}`}>
              {row.value == null ? 'Unavailable' : formatMoney(row.value, bridge.currency)}
            </dd>
            <dd className="mt-1 min-h-4 text-xs text-[var(--ua-text-tertiary)]">
              {row.value == null
                ? 'No known ledger value'
                : row.conversion
                  ? `${row.conversion} of previous stage`
                  : index === 0
                    ? 'Known current exposure'
                    : 'Conversion unavailable'}
            </dd>
          </div>
        ))}
      </dl> : (
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
