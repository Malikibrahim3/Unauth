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
      <section className="ua-section-panel rounded-[var(--radius-lg)] p-5" aria-labelledby="charts-empty-title">
        <h2 id="charts-empty-title" className="text-base font-semibold">Payout performance</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          No reconciled financial activity is available for this period. Charts appear only when payout-case ledger entries include an amount and currency.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-label="Payout performance charts">
      {groups.map(({ bridge, trend, causes }) => (
        <div key={bridge.currency} className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-muted)] pb-2">
            <h2 className="text-base font-semibold">Payout performance</h2>
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              {bridge.currency} · {report.range === 'all' ? 'All time' : `Last ${report.range}`}
            </p>
          </div>

          {!report.reconciliation.ok ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--warning-bd)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-fg)]" role="status">
              Some ledger entries could not be reconciled. Valid currency data remains visible; review the reconciliation notice above before using these figures.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartPanel className="ua-data-surface xl:col-span-8" title="Exposure and recovered">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
                <p className="text-xs text-[var(--text-secondary)]">Daily ledger value</p>
                <ChartLegend items={[{ label: 'Exposure', tone: 'orange' }, { label: 'Recovered', tone: 'green' }]} />
              </div>
              {trend.some((point) => point.exposureMinor != null || point.recoveredMinor != null) ? (
                <>
                  {trend.some((point) => point.exposureMinor == null || point.recoveredMinor == null) ? (
                    <p className="px-4 pt-2 text-xs text-[var(--text-secondary)]" role="status">
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
                        { key: 'exposureMinor', label: 'Exposure', colourVar: '--ua-chart-orange' },
                        { key: 'recoveredMinor', label: 'Recovered', colourVar: '--ua-chart-green' },
                      ]}
                      valueFormatter={(value) => compactMoney(value, bridge.currency)}
                      height={260}
                    />
                  </div>
                  <ChartDataTable currency={bridge.currency} trend={trend} />
                </>
              ) : trend.length ? (
                <>
                  <ChartEmpty message="Dated exposure and recovery values are unavailable for this period." />
                  <ChartDataTable currency={bridge.currency} trend={trend} />
                </>
              ) : (
                <ChartEmpty message="No dated exposure or recovery entries were recorded in this period." />
              )}
            </ChartPanel>

            <div className="xl:col-span-4">
              <RankedContributionChart
                id={`loss-causes-${bridge.currency}`}
                title="Loss causes"
                description="Confirmed loss, ranked by recorded cause"
                items={causes.map((cause) => ({
                  label: cause.name,
                  value: cause.valueMinor,
                  displayValue: compactMoney(cause.valueMinor, bridge.currency),
                  tone: 'orange',
                }))}
              />
              {causes.length ? (
                <Link href={financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: 'confirmed_loss' })} className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)]">
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

function ChartPanel({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={`ua-section-panel overflow-hidden rounded-[var(--radius-lg)] ${className}`}>
      <div className="border-b border-[var(--border-muted)] px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center px-5 py-8">
      <p className="max-w-sm text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
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
    <section className="ua-section-panel rounded-[var(--radius-lg)] xl:col-span-12" aria-labelledby={`recovery-ledger-${bridge.currency}`}>
      <div className="border-b border-[var(--border-muted)] px-4 py-3">
        <h3 id={`recovery-ledger-${bridge.currency}`} className="text-sm font-semibold">Recovery progression</h3>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Reconciled value through the recovery workflow</p>
      </div>
      {hasKnownValue ? <dl className="grid sm:grid-cols-3">
        {rows.map((row, index) => (
          <div key={row.label} className={`p-4 ${index > 0 ? 'border-t border-[var(--border-muted)] sm:border-l sm:border-t-0' : ''}`}>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">{row.label}</dt>
            <dd className={`mt-1 text-xl font-semibold ${dvStyles.mono}`}>
              {row.value == null ? 'Unavailable' : formatMoney(row.value, bridge.currency)}
            </dd>
            <dd className="mt-1 min-h-4 text-xs text-[var(--text-tertiary)]">
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
        <p className="px-4 py-5 text-sm text-[var(--text-secondary)]">Recovery values are unavailable for this period.</p>
      )}
    </section>
  );
}

function ChartDataTable({
  currency,
  trend,
}: {
  currency: string;
  trend: Array<{ date: string; exposureMinor: number | null; recoveredMinor: number | null }>;
}) {
  return (
    <details className="border-t border-[var(--border-muted)] px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)]">View chart data</summary>
      <div className="mt-3 max-h-56 overflow-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b border-[var(--border-muted)] text-left">
              <th className="py-2">Date</th>
              <th className="py-2 text-right">Exposure</th>
              <th className="py-2 text-right">Recovered</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((point) => (
              <tr key={point.date} className="border-b border-[var(--border-muted)]">
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
