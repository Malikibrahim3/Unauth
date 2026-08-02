'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '../core/useChartTheme';
import { ChartTooltip } from '../core/ChartTooltip';
import { ChartCursor } from '../core/ChartCursor';
import { useChartMotion } from '../core/useChartMotion';
import { useChartWidth } from '../core/useChartWidth';
import {
  BAR_CATEGORY_GAP,
  BAR_END_RADIUS,
  CARTESIAN_BAR_SIZE,
  COMPARISON_DOT_R,
  TREND_LINE_WIDTH,
  Y_LABEL_GUTTER,
  Y_LABEL_TICK_MARGIN,
} from '../core/geometry';

export type ComboBarLineDatum = {
  key: string;
  label: string;
  current: number | null;
  previous?: number | null;
  secondary?: number | null;
};

type ComboBarLineChartProps = {
  data: ComboBarLineDatum[];
  /** e.g. '--ua-warning' */
  colourVar: string;
  /** Axis tick formatter — should be compact (e.g. $18k). */
  valueFormatter: (value: number) => string;
  /** Full-precision formatter for tooltip values; defaults to valueFormatter. */
  tooltipFormatter?: (value: number) => string;
  comparison?: boolean;
  secondary?: {
    label: string;
    colourVar: string;
    encoding?: 'bar' | 'line';
    interpolation?: 'linear' | 'stepAfter';
  };
  height?: number;
};

/** Instrument Grade combo chart: substantial bars, an optional secondary series, and comparison markers. */
export function ComboBarLineChart({
  data,
  colourVar,
  valueFormatter,
  tooltipFormatter,
  comparison = false,
  secondary,
  height = 320,
}: ComboBarLineChartProps) {
  const formatTooltip = tooltipFormatter ?? valueFormatter;
  const theme = useChartTheme();
  const hue = (theme as Record<string, string>)[colourVar] || 'var(--ua-chart-primary)';
  const secondaryHue = secondary
    ? (theme as Record<string, string>)[secondary.colourVar] || 'var(--ua-chart-primary-soft)'
    : null;
  const { containerRef, width } = useChartWidth();
  const secondaryIsBar = secondary?.encoding === 'bar';
  const groupedBarSize = secondaryIsBar
    ? Math.max(6, Math.min(24, Math.floor((width / Math.max(1, data.length) - 6) / 2)))
    : CARTESIAN_BAR_SIZE;
  const motion = useChartMotion(data.length * (1 + Number(comparison) + Number(Boolean(secondary))));

  return (
    <div ref={containerRef} style={{ width: '100%', height, overflow: 'hidden' }}>
        <ComposedChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 8, right: 8, bottom: 2, left: 0 }}
          barCategoryGap={BAR_CATEGORY_GAP}
          accessibilityLayer
        >
          <CartesianGrid stroke={theme['--ua-chart-grid']} strokeOpacity={0.78} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={16}
            tick={{
              fontSize: 13,
              fill: theme['--ua-text-tertiary'],
              fontFamily: 'var(--ua-font-sans)',
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={Y_LABEL_GUTTER}
            tickMargin={Y_LABEL_TICK_MARGIN}
            tickCount={4}
            tick={{
              fontSize: 13,
              fill: theme['--ua-text-tertiary'],
              fontFamily: 'var(--ua-font-sans)',
            }}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            cursor={<ChartCursor />}
            isAnimationActive={motion.isAnimationActive}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as ComboBarLineDatum;
              const series = [
                secondary && row.secondary != null && secondaryHue
                  ? { label: secondary.label, value: formatTooltip(row.secondary), colour: secondaryHue }
                  : null,
                comparison && row.previous != null
                  ? { label: 'Previous period', value: formatTooltip(row.previous), colour: theme['--ua-chart-neutral-500'] }
                  : null,
              ].filter((item): item is { label: string; value: string; colour: string } => item != null);
              return (
                <ChartTooltip
                  value={row.current == null ? 'Unavailable' : formatTooltip(row.current)}
                  caption={String(label)}
                  series={series.length ? series : undefined}
                />
              );
            }}
          />
          <Bar
            dataKey="current"
            fill={hue}
            /* Spec §8.3: 4px data-end radius. */
            radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]}
            barSize={groupedBarSize}
            {...motion}
          />
          {secondary && secondaryHue && secondaryIsBar ? (
            <Bar
              dataKey="secondary"
              name={secondary.label}
              fill={secondaryHue}
              radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]}
              barSize={groupedBarSize}
              {...motion}
            />
          ) : secondary && secondaryHue ? (
            <Line
              type={secondary.interpolation ?? 'linear'}
              dataKey="secondary"
              name={secondary.label}
              stroke={secondaryHue}
              strokeWidth={TREND_LINE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls={false}
              dot={{ r: 2.5, fill: secondaryHue, stroke: theme['--ua-surface-primary'], strokeWidth: 2 }}
              activeDot={{ r: 4.5, fill: secondaryHue, stroke: theme['--ua-surface-primary'], strokeWidth: 2 }}
              {...motion}
            />
          ) : null}
          {comparison ? (
            <Line
              type="linear"
              dataKey="previous"
              name="Previous period"
              stroke={theme['--ua-chart-neutral-500']}
              strokeWidth={1.75}
              strokeDasharray="5 4"
              dot={{
                r: COMPARISON_DOT_R,
                fill: theme['--ua-chart-neutral-500'],
                stroke: theme['--ua-surface-primary'],
                strokeWidth: 2,
              }}
              activeDot={{
                r: COMPARISON_DOT_R + 1,
                fill: theme['--ua-chart-neutral-500'],
                stroke: theme['--ua-surface-primary'],
                strokeWidth: 2,
              }}
              connectNulls={false}
              {...motion}
            />
          ) : null}
        </ComposedChart>
    </div>
  );
}
