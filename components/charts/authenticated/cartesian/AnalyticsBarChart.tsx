'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '@/lib/utils/format';
import { useChartTheme } from '../core/useChartTheme';
import { ChartTooltip } from '../core/ChartTooltip';
import { BAR_CATEGORY_GAP, BAR_END_RADIUS, BAR_MAX_SIZE, Y_LABEL_GUTTER, Y_LABEL_TICK_MARGIN } from '../core/geometry';
import { AnalyticsChartEmpty, analyticsAxisStyle, resolveChartColour } from './AnalyticsChartPrimitives';

export interface BarEntry {
  label: string;
  value: number;
  color?: string;
}

export interface AnalyticsBarChartProps {
  data: BarEntry[];
  height?: number;
  defaultColor?: string;
  valueFormatter?: (n: number) => string;
  emptyLabel?: string;
}

/** Shared Recharts-backed categorical bar chart for full analytical surfaces. */
export function AnalyticsBarChart({
  data,
  height = 180,
  defaultColor = 'var(--ua-action-primary)',
  valueFormatter,
  emptyLabel = 'No data yet',
}: AnalyticsBarChartProps) {
  const theme = useChartTheme();
  const fmt = valueFormatter ?? ((n: number) => formatNumber(n));
  const defaultFill = resolveChartColour(defaultColor, theme);

  if (!data || data.length === 0) {
    return <AnalyticsChartEmpty height={height} label={emptyLabel} />;
  }

  return (
    <div style={{ width: '100%', height }} role="img" aria-label="Analytics bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: 0 }} barCategoryGap={BAR_CATEGORY_GAP} accessibilityLayer>
          <CartesianGrid stroke={theme['--ua-chart-grid']} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={16}
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
            cursor={{ fill: 'transparent' }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as BarEntry;
              return <ChartTooltip value={fmt(row.value)} caption={String(label)} />;
            }}
          />
          <Bar
            dataKey="value"
            name="Value"
            fill={defaultFill}
            maxBarSize={BAR_MAX_SIZE}
            radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={resolveChartColour(entry.color ?? defaultColor, theme)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
