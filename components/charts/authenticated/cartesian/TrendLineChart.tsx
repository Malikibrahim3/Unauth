'use client';

import { useId } from 'react';
import {
  Area,
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

/** T3 — trend line with hatched fall. Single-series treatment (money metrics rendered cumulatively). */
export function TrendLineChart({ data, colourVar, valueFormatter, height = 220 }: TrendLineChartProps) {
  const theme = useChartTheme();
  const patternId = useId();
  const maskId = useId();
  const hue = (theme as Record<string, string>)[colourVar] || 'var(--ua-chart-blue)';

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: 0 }}>
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width={5} height={5} patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke={hue} strokeWidth={1} strokeOpacity={0.4} />
            </pattern>
            <linearGradient id={maskId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity={0.85} />
              <stop offset="100%" stopColor="white" stopOpacity={0.1} />
            </linearGradient>
            <mask id={`${maskId}-mask`}>
              <rect width="100%" height="100%" fill={`url(#${maskId})`} />
            </mask>
          </defs>
          <CartesianGrid stroke={theme['--ua-chart-grid']} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={22}
            tick={{ fontSize: 10, fill: theme['--text-tertiary'], fontFamily: 'var(--ua-font-mono)' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={40}
            tickCount={5}
            tick={{ fontSize: 10, fill: theme['--text-tertiary'], fontFamily: 'var(--ua-font-mono)' }}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            cursor={{ stroke: theme['--border-strong'], strokeDasharray: '4 4' }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as TrendPoint;
              return <ChartTooltip value={valueFormatter(row.value)} caption={String(label)} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill={`url(#${patternId})`}
            mask={`url(#${maskId}-mask)`}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={hue}
            strokeWidth={TREND_LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: TREND_HOVER_DOT_R, fill: hue, stroke: theme['--surface'], strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
