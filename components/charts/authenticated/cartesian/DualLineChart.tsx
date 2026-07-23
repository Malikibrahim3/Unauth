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
import { TREND_LINE_WIDTH, TREND_HOVER_DOT_R } from '../core/geometry';

export type DualLineSeries = { key: string; label: string; colourVar: string };
export type DualLinePoint = { key: string; label: string; [seriesKey: string]: string | number | null };

type DualLineChartProps = {
  data: DualLinePoint[];
  series: DualLineSeries[];
  valueFormatter: (value: number) => string;
  height?: number;
};

/** T3 multi-series rules — max 3 lines, no hatch, legend mandatory (rendered by the caller via ChartLegend). */
export function DualLineChart({ data, series, valueFormatter, height = 240 }: DualLineChartProps) {
  const theme = useChartTheme();

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: 0 }}>
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
              return (
                <ChartTooltip
                  caption={String(label)}
                  series={series.map((s) => ({
                    label: s.label,
                    value: (payload[0]?.payload as DualLinePoint)?.[s.key] == null
                      ? 'Unavailable'
                      : valueFormatter(Number((payload[0]?.payload as DualLinePoint)[s.key])),
                    colour: (theme as Record<string, string>)[s.colourVar] || 'var(--ua-chart-blue)',
                  }))}
                />
              );
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={(theme as Record<string, string>)[s.colourVar] || 'var(--ua-chart-blue)'}
              strokeWidth={TREND_LINE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: TREND_HOVER_DOT_R, strokeWidth: 2, stroke: theme['--surface'] }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
