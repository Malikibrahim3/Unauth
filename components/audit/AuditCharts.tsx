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
import { SectionCard } from '@/components/ui/SectionCard';

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
  { key: 'definite', label: 'Definite', color: '#1A1814' },
  { key: 'probable', label: 'Probable', color: '#7B2D26' },
  { key: 'possible', label: 'Possible', color: '#4A4640' },
  { key: 'weak',     label: 'Weak',     color: '#888078' },
] as const;

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-md border text-xs shadow-md"
        style={{ background: '#FFFFFF', borderColor: '#D2C9B5', color: 'var(--text)' }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}><span style={{ color: '#7B2D26', marginRight: 5 }}>§</span>{payload[0].name}</div>
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
        style={{ background: '#FFFFFF', borderColor: '#D2C9B5', color: 'var(--text)' }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}><span style={{ color: '#7B2D26', marginRight: 5 }}>§</span>{label}</div>
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
      <SectionCard title="Match Distribution" description={`${totalTiered.toLocaleString()} ${totalTiered === 1 ? 'customer' : 'customers'} with match signals`}>
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
      </SectionCard>

      {/* Tier counts horizontal bar chart */}
      <SectionCard title="Customers By Match Confidence" description="Counts across all four confidence tiers">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} margin={{ top: 0, right: 8, left: -12, bottom: 0 }} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5DECE" vertical={false} />
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
      </SectionCard>

      {/* Overall composition — full width */}
      <SectionCard title="Overall Composition" className="md:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 text-caption" style={{ color: 'var(--text-subtle)' }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: '#7B2D26' }} />
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
            style={{ width: `${flaggedPct}%`, background: '#7B2D26' }}
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
      </SectionCard>
    </div>
  );
}
