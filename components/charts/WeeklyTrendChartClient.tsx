'use client';

import { useEffect, useState } from 'react';

export type TrendDataPoint = {
  label: string;
  value: number;
  secondaryValue?: number;
};

export interface WeeklyTrendChartProps {
  data: TrendDataPoint[];
  color?: string;
  secondaryColor?: string;
  height?: number;
  valueFormatter?: (n: number) => string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

type CustomTooltipPayload = {
  name: string;
  value: number;
  color: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: CustomTooltipPayload[];
  label?: string;
  valueFormatter?: (n: number) => string;
};

function CustomTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-sm"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{valueFormatter ? valueFormatter(entry.value) : entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

const gradientId = 'trend-primary';
const gradientIdSecondary = 'trend-secondary';

type RechartsModule = typeof import('recharts');

export default function WeeklyTrendChartClient({
  data,
  color = 'var(--accent)',
  secondaryColor = 'var(--warning)',
  height = 140,
  valueFormatter,
  primaryLabel = 'Value',
  secondaryLabel,
}: WeeklyTrendChartProps) {
  const [recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => {
    void import('recharts').then(setRecharts);
  }, []);

  if (!recharts) {
    return (
      <div
        className="w-full skeleton rounded-md"
        style={{ height, background: 'var(--bg-subtle)' }}
        aria-hidden="true"
      />
    );
  }

  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = recharts;
  const hasSecondary = data.some((d) => d.secondaryValue !== undefined);

  return (
    <div className="ua-chart-draw is-visible">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
            {hasSecondary && (
              <linearGradient id={gradientIdSecondary} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.18} />
                <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.02} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-muted)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 500 }}
            axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
            tickLine={false}
            dy={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<CustomTooltip valueFormatter={valueFormatter} />}
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={primaryLabel}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
          {hasSecondary && secondaryLabel && (
            <Area
              type="monotone"
              dataKey="secondaryValue"
              name={secondaryLabel}
              stroke={secondaryColor}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill={`url(#${gradientIdSecondary})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: secondaryColor }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
