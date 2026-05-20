'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
  { key: 'definite', label: 'Definite', color: 'var(--brand-ink)' },
  { key: 'probable', label: 'Probable', color: 'var(--accent)' },
  { key: 'possible', label: 'Possible', color: 'var(--text-muted)' },
  { key: 'weak',     label: 'Weak',     color: 'var(--text-subtle)' },
] as const;

const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-md border text-xs shadow-md"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text)', borderRadius: 6 }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <span aria-hidden="true" className="ua-section-dot" />{label}
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          Customers: <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{payload[0].value.toLocaleString()}</span>
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

  const barData = TIERS
    .slice()
    .reverse()
    .map((t) => ({ name: t.label, value: counts[t.key], color: t.color }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Horizontal stacked evidence-bar */}
      <SectionCard title="Match Distribution" description={`${totalTiered.toLocaleString()} ${totalTiered === 1 ? 'customer' : 'customers'} with match signals`}>
        {totalTiered === 0 ? (
          <div className="flex items-center justify-center h-[120px] rounded-md" style={{ background: 'var(--bg-surface-alt)' }}>
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
                style={{ background: 'var(--risk-low-bg)', color: 'var(--risk-low-fg)' }}
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
          <div className="flex flex-col gap-3">
            {/* Stacked horizontal bar */}
            <div className="h-3 w-full rounded-sm overflow-hidden flex" style={{ background: 'var(--bg-surface-sunk)' }}>
              {TIERS.map((t) => {
                const pct = totalTiered > 0 ? (counts[t.key] / totalTiered) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={t.key}
                    title={`${t.label}: ${counts[t.key].toLocaleString()}`}
                    style={{ width: `${pct}%`, background: t.color }}
                  />
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-1.5">
              {TIERS.filter((t) => counts[t.key] > 0).map((t) => (
                <div key={t.key} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: t.color }} />
                    <span style={{ color: 'var(--text-muted)' }}>{t.label}</span>
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                    {counts[t.key].toLocaleString()}
                    <span style={{ color: 'var(--text-subtle)' }}>
                      {' '}· {totalTiered > 0 ? ((counts[t.key] / totalTiered) * 100).toFixed(1) : 0}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Tier counts bar chart */}
      <SectionCard title="Customers By Match Confidence" description="Counts across all four confidence tiers">
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
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
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
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'var(--accent)' }} />
              With signals {flaggedPct.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'var(--risk-low-fg)' }} />
              No signals {cleanPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-sunk)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${flaggedPct}%`, background: 'var(--accent)' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-caption" style={{ color: 'var(--text-subtle)' }}>
            {totalFlagged.toLocaleString()} with signals of {totalRows.toLocaleString()} transactions
          </span>
          <span className="text-caption font-mono" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {(totalRows - totalFlagged).toLocaleString()} no signals
          </span>
        </div>
      </SectionCard>
    </div>
  );
}
