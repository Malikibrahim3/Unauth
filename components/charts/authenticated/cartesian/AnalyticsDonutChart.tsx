'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNumber } from '@/lib/utils/format';
import { useChartTheme } from '../core/useChartTheme';
import { ChartTooltip } from '../core/ChartTooltip';
import { AnalyticsChartEmpty, resolveChartColour } from './AnalyticsChartPrimitives';

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export interface AnalyticsDonutChartProps {
  data: DonutSlice[];
  height?: number;
  showLegend?: boolean;
  valueFormatter?: (n: number) => string;
  emptyLabel?: string;
}

const DEFAULT_PALETTE = [
  'var(--ua-action-primary)',
  'var(--ua-severity-clear)',
  'var(--ua-severity-probable)',
  'var(--ua-severity-possible)',
  'var(--ua-neutral)',
];

/** Shared Recharts-backed donut chart for full analytical surfaces. */
export function AnalyticsDonutChart({
  data,
  height = 220,
  showLegend = true,
  valueFormatter,
  emptyLabel = 'No data yet',
}: AnalyticsDonutChartProps) {
  const theme = useChartTheme();
  const fmt = valueFormatter ?? ((n: number) => formatNumber(n));
  const total = data?.reduce((sum, slice) => sum + slice.value, 0) ?? 0;

  if (!data || data.length === 0 || total === 0) {
    return <AnalyticsChartEmpty height={height} label={emptyLabel} />;
  }

  const chartHeight = showLegend ? Math.max(120, height - 58) : height;
  return (
    <div style={{ width: '100%', height, display: 'flex', flexDirection: 'column' }} role="img" aria-label="Distribution chart">
      <div style={{ minHeight: 0, flex: '1 1 auto' }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart accessibilityLayer>
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as DonutSlice;
                return <ChartTooltip value={fmt(row.value)} caption={row.label} />;
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="56%"
              outerRadius="78%"
              paddingAngle={2}
              stroke={theme['--ua-surface-primary']}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((slice, index) => (
                <Cell
                  key={slice.label}
                  fill={resolveChartColour(slice.color ?? DEFAULT_PALETTE[index % DEFAULT_PALETTE.length], theme)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {showLegend ? (
        <ul style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px', margin: 0, padding: 0, listStyle: 'none' }}>
          {data.map((slice, index) => {
            const colour = resolveChartColour(slice.color ?? DEFAULT_PALETTE[index % DEFAULT_PALETTE.length], theme);
            return (
              <li key={slice.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: theme['--ua-text-secondary'] }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: colour }} />
                {slice.label} <span style={{ fontFamily: 'var(--ua-font-sans)', fontVariantNumeric: 'tabular-nums', color: theme['--ua-text-tertiary'] }}>{fmt(slice.value)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
