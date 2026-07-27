'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '../core/useChartTheme';
import { ChartTooltip } from '../core/ChartTooltip';
import { TREND_LINE_WIDTH, TREND_HOVER_DOT_R, Y_LABEL_GUTTER, Y_LABEL_TICK_MARGIN } from '../core/geometry';

export type DualLineSeries = { key: string; label: string; colourVar: string };
export type DualLinePoint = { key: string; label: string; [seriesKey: string]: string | number | null };

type DualLineChartProps = {
  data: DualLinePoint[];
  series: DualLineSeries[];
  valueFormatter: (value: number) => string;
  height?: number;
};

/** T3 multi-series rules — max 3 lines with a visible caller-owned legend. */
export function DualLineChart({ data, series, valueFormatter, height = 240 }: DualLineChartProps) {
  const theme = useChartTheme();

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 2, left: 0 }} accessibilityLayer>
          <CartesianGrid stroke={theme['--ua-chart-grid']} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tickMargin={8}
            tick={{ fontSize: 13, fill: theme['--ua-text-tertiary'], fontFamily: 'var(--ua-font-sans)' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={Y_LABEL_GUTTER}
            tickMargin={Y_LABEL_TICK_MARGIN}
            tickCount={5}
            tick={{ fontSize: 13, fill: theme['--ua-text-tertiary'], fontFamily: 'var(--ua-font-sans)' }}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            cursor={{ stroke: theme['--ua-border-strong'], strokeDasharray: '4 4' }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <ChartTooltip
                  caption={String(label)}
                  series={series.map((s) => ({
                    label: s.label,
                    value: (payload[0]?.payload as DualLinePoint)?.[s.key] == null
                      ? 'Unavailable'
                      : valueFormatter(Number((payload[0]?.payload as DualLinePoint)[s.key])),
                    colour: (theme as Record<string, string>)[s.colourVar] || 'var(--ua-chart-primary)',
                  }))}
                />
              );
            }}
          />
          {series.map((s) => {
            const colour = (theme as Record<string, string>)[s.colourVar] || 'var(--ua-chart-primary)';
            return (
              <Line
                key={s.key}
                /* Linear segments keep sparse financial observations honest. Cubic
                 * smoothing made a valid final point look like an overshoot. */
                type="linear"
                dataKey={s.key}
                name={s.label}
                stroke={colour}
                strokeWidth={TREND_LINE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                connectNulls={false}
                dot={{ r: 3, fill: colour, stroke: theme['--ua-surface-primary'], strokeWidth: 2 }}
                activeDot={{ r: TREND_HOVER_DOT_R, fill: colour, stroke: theme['--ua-surface-primary'], strokeWidth: 2 }}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
