'use client';

import {
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
import { TREND_HOVER_DOT_R, TREND_LINE_WIDTH } from '../core/geometry';

export type TrendPoint = { key: string; label: string; value: number };

type TrendLineChartProps = {
  data: TrendPoint[];
  colourVar: string;
  valueFormatter: (value: number) => string;
  height?: number;
};

/** T3 — restrained single-series trend line with a flat area wash. */
export function TrendLineChart({ data, colourVar, valueFormatter, height = 220 }: TrendLineChartProps) {
  const theme = useChartTheme();
  const hue = (theme as Record<string, string>)[colourVar] || 'var(--ua-chart-1)';

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: 0 }}>
          <CartesianGrid stroke={theme['--ua-chart-grid']} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={22}
            tick={{ fontSize: 13, fill: theme['--ua-text-tertiary'], fontFamily: 'var(--ua-font-sans)' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={40}
            tickCount={5}
            tick={{ fontSize: 13, fill: theme['--ua-text-tertiary'], fontFamily: 'var(--ua-font-sans)' }}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            cursor={{ stroke: theme['--ua-border-strong'], strokeDasharray: '4 4' }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as TrendPoint;
              return <ChartTooltip value={valueFormatter(row.value)} caption={String(label)} />;
            }}
          />
          {/*
            Spec §8.3: a line is a 2px stroke with no area wash by default. The
            opacity fill that used to sit under the line is a decorative fill
            (§16.4) and it made two overlapping series unreadable.
          */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={hue}
            strokeWidth={TREND_LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: TREND_HOVER_DOT_R, fill: hue, stroke: theme['--ua-surface-primary'], strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
