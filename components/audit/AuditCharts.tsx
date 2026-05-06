'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface Props {
  counts: {
    definite: number;
    probable: number;
    possible: number;
    weak: number;
  };
  totalRows: number;
  totalFlagged: number;
}

const TIERS = [
  { key: 'definite', label: 'Definite', color: 'var(--risk-critical)' },
  { key: 'probable', label: 'Probable', color: 'var(--risk-high)' },
  { key: 'possible', label: 'Possible', color: 'var(--risk-medium)' },
  { key: 'weak',     label: 'Weak',     color: 'var(--risk-low)' },
] as const;

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
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

const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-md border text-xs shadow-md"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
      >
        <div className="font-medium mb-0.5">{label}</div>
        <div style={{ color: 'var(--text-muted)' }}>
          Customers: <span style={{ color: 'var(--text)' }}>{payload[0].value.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function AuditCharts({ counts, totalRows, totalFlagged }: Props) {
  const totalTiered = counts.definite + counts.probable + counts.possible + counts.weak;
  const flaggedPct = totalRows > 0 ? (totalFlagged / totalRows) * 100 : 0;
  const cleanPct = 100 - flaggedPct;

  const pieData = TIERS
    .map((t) => ({ name: t.label, value: counts[t.key], color: t.color }))
    .filter((d) => d.value > 0);

  const barData = TIERS
    .slice()
    .reverse()
    .map((t) => ({ name: t.label, value: counts[t.key], color: t.color }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Risk Distribution donut */}
      <div
        className="rounded-lg border px-5 pt-4 pb-3"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="text-overline mb-0.5" style={{ color: 'var(--text-muted)' }}>Match Distribution</div>
        <div className="text-caption mb-3" style={{ color: 'var(--text-subtle)' }}>
          {totalTiered.toLocaleString()} {totalTiered === 1 ? 'customer' : 'customers'} with match signals
        </div>
        {pieData.length === 0 ? (
          <div className="flex items-center justify-center h-[160px] rounded-md" style={{ background: 'var(--bg-subtle)' }}>
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
                style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-caption font-medium" style={{ color: 'var(--text)' }}>No match signals found</p>
              <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>All transactions appear clean</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text)' }}>
                    {d.value.toLocaleString()}
                    <span style={{ color: 'var(--text-subtle)' }}>
                      {' '}· {totalTiered > 0 ? ((d.value / totalTiered) * 100).toFixed(1) : 0}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tier counts horizontal bar chart */}
      <div
        className="rounded-lg border px-5 pt-4 pb-3"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="text-overline mb-0.5" style={{ color: 'var(--text-muted)' }}>Customers by Match Confidence</div>
        <div className="text-caption mb-4" style={{ color: 'var(--text-subtle)' }}>Counts across all four confidence tiers</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} margin={{ top: 0, right: 8, left: -12, bottom: 0 }} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--text-subtle)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-subtle)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--bg-subtle)' }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Overall composition — full width */}
      <div
        className="md:col-span-2 rounded-lg border px-5 py-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-overline" style={{ color: 'var(--text-muted)' }}>Overall Composition</div>
          <div className="flex items-center gap-4 text-caption" style={{ color: 'var(--text-subtle)' }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'var(--risk-high)' }} />
              With signals {flaggedPct.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'var(--risk-low)' }} />
              No signals {cleanPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-muted, var(--bg-subtle))' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${flaggedPct}%`, background: 'var(--risk-high)' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-caption" style={{ color: 'var(--text-subtle)' }}>
            {totalFlagged.toLocaleString()} with signals of {totalRows.toLocaleString()} transactions
          </span>
          <span className="text-caption font-mono" style={{ color: 'var(--text-muted)' }}>
            {(totalRows - totalFlagged).toLocaleString()} no signals
          </span>
        </div>
      </div>
    </div>
  );
}
