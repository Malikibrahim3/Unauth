'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '../core/useChartTheme';
import { ChartTooltip } from '../core/ChartTooltip';
import {
  BAR_CATEGORY_GAP,
  BAR_END_RADIUS,
  BAR_MAX_SIZE,
  COMPARISON_DASH,
  COMPARISON_DOT_R,
  COMPARISON_LINE_WIDTH,
  Y_LABEL_GUTTER,
  Y_LABEL_TICK_MARGIN,
} from '../core/geometry';

export type ComboBarLineDatum = {
  key: string;
  label: string;
  current: number | null;
  previous?: number | null;
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
  height?: number;
};

/** Quiet Precision combo chart: flat bars, restrained axes, and optional comparison line. */
export function ComboBarLineChart({
  data,
  colourVar,
  valueFormatter,
  tooltipFormatter,
  comparison = false,
  height = 220,
}: ComboBarLineChartProps) {
  const formatTooltip = tooltipFormatter ?? valueFormatter;
  const theme = useChartTheme();
  const hue = (theme as Record<string, string>)[colourVar] || 'var(--ua-chart-primary)';

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 2, left: 0 }}
          barCategoryGap={BAR_CATEGORY_GAP}
          accessibilityLayer
        >
          <CartesianGrid stroke={theme['--ua-chart-grid']} vertical={false} />
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
            tickCount={5}
            tick={{
              fontSize: 13,
              fill: theme['--ua-text-tertiary'],
              fontFamily: 'var(--ua-font-sans)',
            }}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as ComboBarLineDatum;
              return (
                <ChartTooltip
                  value={row.current == null ? 'Unavailable' : formatTooltip(row.current)}
                  caption={String(label)}
                  series={
                    comparison && row.previous != null
                      ? [{ label: 'Previous', value: formatTooltip(row.previous), colour: 'var(--ua-icon-secondary)' }]
                      : undefined
                  }
                />
              );
            }}
          />
          <Bar
            dataKey="current"
            fill={hue}
            /* Spec §8.3: 4px data-end radius. */
            radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]}
            maxBarSize={BAR_MAX_SIZE}
            isAnimationActive={false}
          />
          {comparison ? (
            <Line
              type="linear"
              dataKey="previous"
              stroke="var(--ua-chart-neutral-500)"
              strokeWidth={COMPARISON_LINE_WIDTH}
              strokeDasharray={COMPARISON_DASH.join(' ')}
              dot={{ r: COMPARISON_DOT_R, fill: 'var(--ua-icon-secondary)', stroke: 'var(--ua-surface-primary)', strokeWidth: 2 }}
              activeDot={{ r: COMPARISON_DOT_R + 1 }}
              connectNulls
              isAnimationActive={false}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
