'use client';

import { useEffect, useState } from 'react';

export type HBarEntry = { label: string; value: number; color?: string };

export interface HBarChartProps {
  data: HBarEntry[];
  total?: number;
  height?: number;
  defaultColor?: string;
  valueFormatter?: (n: number) => string;
  yAxisWidth?: number;
}

type RechartsModule = typeof import('recharts');

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  valueFormatter?: (n: number) => string;
};

function Tooltip({ active, payload, label, valueFormatter }: TooltipProps) {
  if (!active || !payload || !payload[0]) return null;
  const val = payload[0].value;
  return (
    <div
      className="rounded border px-2.5 py-1.5 text-xs shadow-sm"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      <p className="mb-0.5 font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="font-semibold">{valueFormatter ? valueFormatter(val) : val.toLocaleString()}</p>
    </div>
  );
}

export default function HBarChartClient({
  data,
  total,
  height = 180,
  defaultColor = 'var(--accent)',
  valueFormatter,
  yAxisWidth = 130,
}: HBarChartProps) {
  const [recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => { void import('recharts').then(setRecharts); }, []);

  if (!recharts) {
    return (
      <div
        className="w-full animate-pulse rounded-md"
        style={{ height, background: 'var(--bg-subtle)' }}
        aria-hidden="true"
      />
    );
  }

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip: ReTooltip, Cell } = recharts;
  const maxVal = total ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="ua-chart-draw is-visible">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 2, right: 12, left: 0, bottom: 2 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-muted)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, maxVal]}
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
          />
          <ReTooltip
            content={<Tooltip valueFormatter={valueFormatter} />}
            cursor={{ fill: 'color-mix(in srgb, var(--accent) 6%, transparent)' }}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color ?? defaultColor} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
