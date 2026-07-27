'use client';

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
import { formatNumber } from '@/lib/utils/format';
import { useChartTheme } from '../core/useChartTheme';
import { ChartTooltip } from '../core/ChartTooltip';
import { TREND_HOVER_DOT_R, TREND_LINE_WIDTH, Y_LABEL_GUTTER, Y_LABEL_TICK_MARGIN } from '../core/geometry';
import { AnalyticsChartEmpty, analyticsAxisStyle, resolveChartColour } from './AnalyticsChartPrimitives';

export interface LineDataPoint {
  label: string;
  value: number;
}

export interface AnalyticsLineChartProps {
  data: LineDataPoint[];
  height?: number;
  color?: string;
  valueFormatter?: (n: number) => string;
  seriesName?: string;
  area?: boolean;
  emptyLabel?: string;
}

/** Shared Recharts-backed line chart for full analytical surfaces. */
export function AnalyticsLineChart({
  data,
  height = 200,
  color = 'var(--ua-action-primary)',
  valueFormatter,
  seriesName = 'Value',
  area = false,
  emptyLabel = 'No data yet',
}: AnalyticsLineChartProps) {
  const theme = useChartTheme();
  const fmt = valueFormatter ?? ((n: number) => formatNumber(n));
  const stroke = resolveChartColour(color, theme);

  if (!data || data.length === 0) {
    return <AnalyticsChartEmpty height={height} label={emptyLabel} />;
  }

  return (
    <div style={{ width: '100%', height }} role="img" aria-label={`${seriesName} line chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }} accessibilityLayer>
          <CartesianGrid stroke={theme['--ua-chart-grid']} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={22}
            tickMargin={8}
            tick={{ ...analyticsAxisStyle, fill: theme['--ua-text-tertiary'] }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={Y_LABEL_GUTTER}
            tickMargin={Y_LABEL_TICK_MARGIN}
            tickCount={5}
            tick={{ ...analyticsAxisStyle, fill: theme['--ua-text-tertiary'] }}
            tickFormatter={fmt}
          />
          <Tooltip
            cursor={{ stroke: theme['--ua-border-strong'], strokeDasharray: '4 4' }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as LineDataPoint;
              return <ChartTooltip value={fmt(row.value)} caption={`${seriesName} · ${String(label)}`} />;
            }}
          />
          {area ? (
            <Area
              type="linear"
              dataKey="value"
              fill={stroke}
              fillOpacity={0.12}
              stroke="none"
              isAnimationActive={false}
            />
          ) : null}
          <Line
            type="linear"
            dataKey="value"
            name={seriesName}
            stroke={stroke}
            strokeWidth={TREND_LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 3, fill: stroke, stroke: theme['--ua-surface-primary'], strokeWidth: 2 }}
            activeDot={{ r: TREND_HOVER_DOT_R, fill: stroke, stroke: theme['--ua-surface-primary'], strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
