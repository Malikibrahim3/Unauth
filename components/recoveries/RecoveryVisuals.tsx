"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartFrame,
  ChartLegend,
  ChartState,
  type ChartDataTableModel,
} from '@/components/charts/authenticated/ChartFrame';
import { ChartCursor } from '@/components/charts/authenticated/core/ChartCursor';
import { ChartTooltip } from '@/components/charts/authenticated/core/ChartTooltip';
import { useChartMotion } from '@/components/charts/authenticated/core/useChartMotion';
import { useChartTheme } from '@/components/charts/authenticated/core/useChartTheme';
import { useChartWidth } from '@/components/charts/authenticated/core/useChartWidth';
import { BAR_CATEGORY_GAP, BAR_END_RADIUS, TREND_LINE_WIDTH, Y_LABEL_GUTTER, Y_LABEL_TICK_MARGIN } from '@/components/charts/authenticated/core/geometry';
import { formatMinorCurrencyNullable, formatPercent } from '@/lib/utils/format';

export type RecoveryTrendPoint = {
  key: string;
  label: string;
  recoveredMinor: number;
  outstandingMinor: number;
  recoveryRate: number | null;
};

type RecoveryTrendProps = {
  currency: string | null;
  points: RecoveryTrendPoint[];
  mixedCurrencyCount: number;
};

function percent(value: number) {
  return formatPercent(value, 0);
}

function RecoveryTrendPlot({ points, currency }: { points: RecoveryTrendPoint[]; currency: string }) {
  const theme = useChartTheme();
  const { containerRef, width } = useChartWidth();
  const motion = useChartMotion(points.length * 3);
  const money = (value: number) => formatMinorCurrencyNullable(Math.round(value), currency);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 320, overflow: 'hidden' }}>
      <ComposedChart width={width} height={320} data={points} margin={{ top: 8, right: 18, bottom: 2, left: 0 }} barCategoryGap={BAR_CATEGORY_GAP} accessibilityLayer>
        <CartesianGrid stroke={theme['--ua-chart-grid']} strokeOpacity={0.78} vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={16} tick={{ fontSize: 13, fill: theme['--ua-text-tertiary'], fontFamily: 'var(--ua-font-sans)' }} />
        <YAxis yAxisId="amount" axisLine={false} tickLine={false} width={Y_LABEL_GUTTER} tickMargin={Y_LABEL_TICK_MARGIN} tickCount={4} tick={{ fontSize: 13, fill: theme['--ua-text-tertiary'], fontFamily: 'var(--ua-font-sans)' }} tickFormatter={money} />
        <YAxis yAxisId="rate" orientation="right" axisLine={false} tickLine={false} width={42} tickCount={4} domain={[0, 1]} tick={{ fontSize: 13, fill: theme['--ua-text-tertiary'], fontFamily: 'var(--ua-font-sans)' }} tickFormatter={percent} />
        <Tooltip
          cursor={<ChartCursor />}
          isAnimationActive={motion.isAnimationActive}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as RecoveryTrendPoint;
            return (
              <ChartTooltip
                value={money(point.recoveredMinor)}
                caption={String(label)}
                series={[
                  { label: 'Outstanding', value: money(point.outstandingMinor), colour: theme['--ua-chart-neutral-500'] },
                  ...(point.recoveryRate == null ? [] : [{ label: 'Conversion rate', value: percent(point.recoveryRate), colour: theme['--ua-chart-primary-soft'] }]),
                ]}
              />
            );
          }}
        />
        <Bar yAxisId="amount" dataKey="recoveredMinor" name="Recovered" fill={theme['--ua-chart-primary']} radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]} barSize={28} {...motion} />
        {/* Neutral-500, not the darker neutral-700 — a heavier grey than the
            violet primary reads as the dominant series, inverting which value
            the eye lands on first (§7.5). */}
        <Bar yAxisId="amount" dataKey="outstandingMinor" name="Outstanding" fill={theme['--ua-chart-neutral-500']} radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]} barSize={28} {...motion} />
        <Line yAxisId="rate" type="linear" dataKey="recoveryRate" name="Conversion rate" stroke={theme['--ua-chart-primary-soft']} strokeWidth={TREND_LINE_WIDTH} strokeLinecap="round" dot={{ r: 2.5, fill: theme['--ua-chart-primary-soft'], stroke: theme['--ua-surface-primary'], strokeWidth: 2 }} activeDot={{ r: 4.5, fill: theme['--ua-chart-primary-soft'], stroke: theme['--ua-surface-primary'], strokeWidth: 2 }} connectNulls={false} {...motion} />
      </ComposedChart>
    </div>
  );
}

/** Weekly financial-entry view. It never reconstructs history from mutable recovery rows. */
export function RecoveryTrend({ currency, points, mixedCurrencyCount }: RecoveryTrendProps) {
  if (mixedCurrencyCount > 0) {
    return (
      <ChartFrame id="recovery-weekly-trend" kind="recovery-weekly" question="Is recoverable value converting into cash?" summary="Recovery amounts are separated by currency." scope="Financial entries" compact>
        <ChartState kind="mixed-currency" title="Weekly recovery trend is currency-specific" description="Choose one currency before comparing recovered and outstanding value. Mixed-currency totals are not combined." minHeight={200} />
      </ChartFrame>
    );
  }
  if (!currency || points.length < 3) {
    return (
      <ChartFrame id="recovery-weekly-trend" kind="recovery-weekly" question="Is recoverable value converting into cash?" summary="Weekly recovery movement needs at least three dated financial-entry weeks." scope="Recovered and recoverable financial entries" compact>
        <ChartState kind="insufficient-history" title="Not enough recovery history yet" description="The board still shows the current action queue. A weekly trend appears once three truthful weekly financial-entry points are available." minHeight={200} />
      </ChartFrame>
    );
  }

  const table: ChartDataTableModel = {
    caption: `Weekly recovery movement in ${currency}`,
    columns: [
      { key: 'week', header: 'Week' },
      { key: 'recovered', header: 'Recovered', numeric: true },
      { key: 'outstanding', header: 'Outstanding', numeric: true },
      { key: 'rate', header: 'Conversion rate', numeric: true },
    ],
    rows: points.map((point) => ({
      key: point.key,
      header: point.label,
      values: [
        formatMinorCurrencyNullable(point.recoveredMinor, currency),
        formatMinorCurrencyNullable(point.outstandingMinor, currency),
        point.recoveryRate == null ? '—' : percent(point.recoveryRate),
      ],
    })),
  };

  return (
    <ChartFrame
      id="recovery-weekly-trend"
      kind="recovery-weekly"
      question="Is recoverable value converting into cash?"
      summary="Recovered value is the weekly cash/credit entry; outstanding is the remaining recoverable balance at week end."
      scope={`${currency} · weekly financial-entry effective dates`}
      legend={
        <ChartLegend
          items={[
            { label: 'Recovered', tone: 'primary' },
            { label: 'Outstanding', tone: 'neutralSoft' },
            { label: 'Conversion rate (recovered ÷ recovered + outstanding)', tone: 'secondary' },
          ]}
        />
      }
      freshness="Source: append-only recoverable and recovered financial entries"
      table={table}
    >
      <RecoveryTrendPlot points={points} currency={currency} />
    </ChartFrame>
  );
}

export type RecoveryProgressStep = {
  key: string;
  label: string;
  valueMinor: number;
  detail: string;
};

/** The recovery detail's factual amount progression, not a status decoration. */
export function RecoveryProgress({ currency, steps }: { currency: string; steps: RecoveryProgressStep[] }) {
  return (
    <section className="ua-focal-panel p-4" aria-labelledby="recovery-progress-title">
      <div className="mb-4">
        <h2 id="recovery-progress-title" className="ua-text-section-title text-[var(--ua-text-primary)]">How far has this recovery progressed?</h2>
        <p className="ua-text-caption-role mt-1">Amounts are cumulative. Approved value is not presented as received cash.</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Recovery amount progression">
        {steps.map((step, index) => (
          <li key={step.key} className="min-w-0 border-l-2 border-[var(--ua-border-default)] pl-3">
            <p className="ua-text-label text-[var(--ua-text-secondary)]"><span className="mr-1 text-[var(--ua-text-tertiary)]">{index + 1}.</span>{step.label}</p>
            <p className="ua-text-kpi mt-1 font-sans tabular-nums text-[var(--ua-text-primary)]">{formatMinorCurrencyNullable(step.valueMinor, currency)}</p>
            <p className="ua-text-metadata mt-1">{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
