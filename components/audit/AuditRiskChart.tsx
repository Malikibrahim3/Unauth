'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const TIERS = [
  { key: 'critical', label: 'Critical', color: 'var(--risk-critical)' },
  { key: 'high',     label: 'High',     color: 'var(--risk-high)' },
  { key: 'medium',   label: 'Medium',   color: 'var(--risk-medium)' },
  { key: 'low',      label: 'Low',      color: 'var(--risk-low)' },
] as const;

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-md border text-xs shadow-md"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
      >
        <div className="font-medium">{payload[0].name}</div>
        <div style={{ color: 'var(--text-muted)' }}>{payload[0].value.toLocaleString()} customers</div>
      </div>
    );
  }
  return null;
};

export default function AuditRiskChart({ counts }: Props) {
  const data = TIERS.map((t) => ({ name: t.label, value: counts[t.key], color: t.color })).filter((d) => d.value > 0);
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div
      className="rounded-lg border px-5 pt-4 pb-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="text-overline mb-0.5" style={{ color: 'var(--text-muted)' }}>Risk Distribution</div>
      <div className="text-caption mb-3" style={{ color: 'var(--text-subtle)' }}>{total.toLocaleString()} flagged customers</div>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={46}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 flex-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-xs gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
              </span>
              <span className="font-mono" style={{ color: 'var(--text)' }}>
                {d.value.toLocaleString()}
                <span style={{ color: 'var(--text-subtle)' }}> · {total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
