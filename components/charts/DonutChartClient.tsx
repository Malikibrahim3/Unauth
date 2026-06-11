'use client';

import { useEffect, useState } from 'react';

export type DonutEntry = { label: string; value: number; color: string };

export interface DonutChartProps {
  data: DonutEntry[];
  height?: number;
}

type RechartsModule = typeof import('recharts');

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
};

function Tooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || !payload[0]) return null;
  const entry = payload[0];
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
      <p className="font-semibold" style={{ color: entry.payload.color }}>{entry.name}</p>
      <p style={{ color: 'var(--text-secondary)' }}>{entry.value.toLocaleString()}</p>
    </div>
  );
}

export default function DonutChartClient({ data, height = 220 }: DonutChartProps) {
  const [recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => { void import('recharts').then(setRecharts); }, []);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!recharts) {
    return (
      <div
        className="w-full animate-pulse rounded-md"
        style={{ height, background: 'var(--bg-subtle)' }}
        aria-hidden="true"
      />
    );
  }

  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip: ReTooltip } = recharts;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center rounded-md" style={{ height, background: 'var(--bg-subtle)' }}>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No data yet</p>
      </div>
    );
  }

  const chartH = height - 44;

  return (
    <div className="ua-chart-draw is-visible flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={chartH}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="52%"
            outerRadius="78%"
            strokeWidth={0}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <ReTooltip content={<Tooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {data.map((entry) => (
          <div key={entry.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: entry.color }}
            />
            <span
              className="text-xs"
              style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
            >
              {entry.label} · {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
