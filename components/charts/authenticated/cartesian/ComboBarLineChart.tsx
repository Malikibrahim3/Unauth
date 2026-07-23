'use client';

import { useId, useMemo } from 'react';
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
  BAR_CAP_H,
  BAR_FILL_BASE_OPACITY,
  BAR_FILL_TOP_OPACITY,
  BAR_MAX_W,
  BAR_TOP_RADIUS,
  COMPARISON_DASH,
  COMPARISON_DOT_R,
  COMPARISON_LINE_WIDTH,
} from '../core/geometry';

export type ComboBarLineDatum = {
  key: string;
  label: string;
  current: number | null;
  previous?: number | null;
};

type ComboBarLineChartProps = {
  data: ComboBarLineDatum[];
  /** e.g. '--ua-chart-orange' */
  colourVar: string;
  /** Axis tick formatter — should be compact (e.g. $18k). */
  valueFormatter: (value: number) => string;
  /** Full-precision formatter for tooltip values; defaults to valueFormatter. */
  tooltipFormatter?: (value: number) => string;
  comparison?: boolean;
  height?: number;
};

/** T4 — cap-top gradient bars + dashed comparison overlay. The flagship dashboard/reports combo chart. */
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
  const gradientId = useId();
  const hue = (theme as Record<string, string>)[colourVar] || 'var(--ua-chart-blue)';

  const CapTopBar = useMemo(
    () =>
      function CapTopBarShape(rawProps: unknown) {
        const { x = 0, y = 0, width = 0, height: h = 0 } = rawProps as {
          x?: number;
          y?: number;
          width?: number;
          height?: number;
        };
        if (h <= 0) return <></>;
        const r = Math.min(BAR_TOP_RADIUS, width / 2);
        return (
          <g>
            <path
              d={`M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + h} Z`}
              fill={`url(#${gradientId})`}
            />
            <rect x={x} y={y} width={width} height={Math.min(BAR_CAP_H, h)} rx={1} fill={hue} />
          </g>
        );
      },
    [gradientId, hue],
  );

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: 0 }} barCategoryGap="20%">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hue} stopOpacity={BAR_FILL_TOP_OPACITY} />
              <stop offset="100%" stopColor={hue} stopOpacity={BAR_FILL_BASE_OPACITY} />
            </linearGradient>
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
                      ? [{ label: 'Previous', value: formatTooltip(row.previous), colour: 'var(--icon-muted)' }]
                      : undefined
                  }
                />
              );
            }}
          />
          <Bar dataKey="current" shape={CapTopBar} maxBarSize={BAR_MAX_W} isAnimationActive={false} />
          {comparison ? (
            <Line
              type="linear"
              dataKey="previous"
              stroke="var(--icon-muted)"
              strokeWidth={COMPARISON_LINE_WIDTH}
              strokeDasharray={COMPARISON_DASH.join(' ')}
              dot={{ r: COMPARISON_DOT_R, fill: 'var(--icon-muted)', stroke: 'var(--surface)', strokeWidth: 2 }}
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
