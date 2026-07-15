'use client';

import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { IntelligenceReport, MoneyBridge } from '@/lib/reporting/intelligence';
import {
  formatCurrencyCompact,
  formatDateAbsolute,
  formatMoney,
} from '@/lib/utils/format';

type CurrencyCharts = {
  bridge: MoneyBridge;
  causes: Array<{ name: string; valueMinor: number }>;
  trend: Array<{ date: string; exposureMinor: number; recoveredMinor: number }>;
};

function compactMoney(valueMinor: number, currency: string) {
  return formatCurrencyCompact(valueMinor / 100, currency);
}

function conversion(numerator: number, denominator: number): string | null {
  if (denominator <= 0 || numerator < 0) return null;
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function chartData(report: IntelligenceReport): CurrencyCharts[] {
  return report.bridges.map((bridge) => ({
    bridge,
    trend: report.trend
      .filter((point) => point.currency === bridge.currency)
      .map((point) => ({
        date: point.date,
        exposureMinor: point.exposureMinor,
        recoveredMinor: point.recoveredMinor,
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
      <section className="ua-section-panel rounded-[var(--ua-radius-card)] p-5" aria-labelledby="charts-empty-title">
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
            <div className="rounded-[var(--ua-radius-card)] border border-[var(--warning-bd)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-fg)]" role="status">
              Some ledger entries could not be reconciled. Valid currency data remains visible; review the reconciliation notice above before using these figures.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ChartPanel className="xl:col-span-8" title="Exposure and recovered">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
                <p className="text-xs text-[var(--text-secondary)]">Daily ledger value</p>
                <div className="flex flex-wrap items-center gap-4 text-xs" aria-label="Chart legend">
                  <LegendItem colour="var(--text-primary)" label="Exposure" />
                  <LegendItem colour="var(--success)" label="Recovered" />
                </div>
              </div>
              {trend.length ? (
                <>
                  <div className="h-[280px] min-h-[220px] px-2 pb-2 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend} margin={{ top: 16, right: 20, bottom: 4, left: 8 }}>
                        <CartesianGrid stroke="var(--border-muted)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          minTickGap={32}
                          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                          tickFormatter={(value: string) => formatDateAbsolute(value)}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickCount={5}
                          width={64}
                          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                          tickFormatter={(value: number) => compactMoney(value, bridge.currency)}
                        />
                        <Tooltip
                          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                          content={({ active, label, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="min-w-44 rounded-[var(--ua-radius-overlay)] border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-3 py-2 shadow-[var(--ua-shadow-overlay)]">
                                <p className="text-xs font-semibold text-[var(--text-primary)]">{formatDateAbsolute(String(label))}</p>
                                <dl className="mt-2 space-y-1.5">
                                  {payload.map((item) => (
                                    <div key={String(item.dataKey)} className="flex items-center justify-between gap-5 text-xs">
                                      <dt className="text-[var(--text-secondary)]">{item.dataKey === 'exposureMinor' ? 'Exposure' : 'Recovered'}</dt>
                                      <dd className="font-semibold tabular-nums text-[var(--text-primary)]">{formatMoney(Number(item.value), bridge.currency)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="linear"
                          dataKey="exposureMinor"
                          name="Exposure"
                          stroke="var(--text-primary)"
                          strokeWidth={2}
                          dot={trend.length === 1 ? { r: 3, fill: 'var(--text-primary)' } : false}
                          activeDot={{ r: 4 }}
                          isAnimationActive={false}
                        />
                        <Line
                          type="linear"
                          dataKey="recoveredMinor"
                          name="Recovered"
                          stroke="var(--success)"
                          strokeWidth={2}
                          dot={trend.length === 1 ? { r: 3, fill: 'var(--success)' } : false}
                          activeDot={{ r: 4 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartDataTable currency={bridge.currency} trend={trend} />
                </>
              ) : (
                <ChartEmpty message="No dated exposure or recovery entries were recorded in this period." />
              )}
            </ChartPanel>

            <ChartPanel className="xl:col-span-4" title="Loss causes">
              <p className="px-4 pt-3 text-xs text-[var(--text-secondary)]">Confirmed loss, ranked by recorded cause</p>
              {causes.length ? (
                <div className="px-2 pb-4 pt-2" style={{ height: Math.max(220, causes.length * 38 + 54) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={causes} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        width={126}
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--surface-hover)' }}
                        content={({ active, payload }) => {
                          const row = payload?.[0]?.payload as { name?: string; valueMinor?: number } | undefined;
                          if (!active || !row?.name || row.valueMinor == null) return null;
                          return (
                            <div className="rounded-[var(--ua-radius-overlay)] border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-3 py-2 shadow-[var(--ua-shadow-overlay)]">
                              <p className="text-xs text-[var(--text-secondary)]">{row.name}</p>
                              <p className="mt-1 text-sm font-semibold tabular-nums">{formatMoney(row.valueMinor, bridge.currency)}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="valueMinor" fill="var(--text-secondary)" radius={[0, 2, 2, 0]} barSize={12} isAnimationActive={false}>
                        <LabelList
                          dataKey="valueMinor"
                          position="right"
                          formatter={(value: number) => compactMoney(value, bridge.currency)}
                          fill="var(--text-primary)"
                          fontSize={11}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmpty message="No confirmed loss has been attributed to a cause in this period." />
              )}
              {causes.length ? (
                <Link href={`/reports/records?kind=case&dimension=category&range=${report.range}&currency=${bridge.currency}`} className="mx-4 mb-4 inline-flex text-xs font-semibold text-[var(--accent)]">
                  View all causes
                </Link>
              ) : null}
            </ChartPanel>

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
            <section className={`ua-section-panel overflow-hidden rounded-[var(--ua-radius-card)] ${className}`}>
      <div className="border-b border-[var(--border-muted)] px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function LegendItem({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
      <span className="h-0.5 w-4" style={{ background: colour }} aria-hidden="true" />
      {label}
    </span>
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
  const rows = [
    { label: 'Detected', value: bridge.requestedMinor, conversion: null },
    { label: 'Pursued', value: bridge.recoverableMinor, conversion: conversion(bridge.recoverableMinor, bridge.requestedMinor) },
    { label: 'Recovered', value: bridge.recoveredMinor, conversion: conversion(bridge.recoveredMinor, bridge.recoverableMinor) },
  ];
  const hasActivity = rows.some((row) => row.value > 0);

  return (
    <section className="ua-section-panel rounded-[var(--ua-radius-card)] xl:col-span-12" aria-labelledby={`recovery-ledger-${bridge.currency}`}>
      <div className="border-b border-[var(--border-muted)] px-4 py-3">
        <h3 id={`recovery-ledger-${bridge.currency}`} className="text-sm font-semibold">Recovery progression</h3>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Reconciled value through the recovery workflow</p>
      </div>
      {hasActivity ? <dl className="grid sm:grid-cols-3">
        {rows.map((row, index) => (
          <div key={row.label} className={`p-4 ${index > 0 ? 'border-t border-[var(--border-muted)] sm:border-l sm:border-t-0' : ''}`}>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">{row.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(row.value, bridge.currency)}</dd>
            <dd className="mt-1 min-h-4 text-xs text-[var(--text-tertiary)]">
              {row.conversion ? `${row.conversion} of previous stage` : index === 0 ? 'Requested payout value' : 'Conversion unavailable'}
            </dd>
          </div>
        ))}
      </dl> : (
        <p className="px-4 py-5 text-sm text-[var(--text-secondary)]">No recovery value entered this period.</p>
      )}
    </section>
  );
}

function ChartDataTable({
  currency,
  trend,
}: {
  currency: string;
  trend: Array<{ date: string; exposureMinor: number; recoveredMinor: number }>;
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
                <td className="py-2 text-right tabular-nums">{formatMoney(point.exposureMinor, currency)}</td>
                <td className="py-2 text-right tabular-nums">{formatMoney(point.recoveredMinor, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
