'use client';

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
  { key: 'definite', label: 'Definite', color: 'var(--sev-definite)' },
  { key: 'probable', label: 'Probable', color: 'var(--sev-probable)' },
  { key: 'possible', label: 'Possible', color: 'var(--sev-neutral)' },
  { key: 'weak',     label: 'Weak',     color: 'color-mix(in srgb, var(--sev-neutral) 45%, var(--surface-muted))' },
] as const;

export default function AuditCharts({ counts, totalRows, totalFlagged }: Props) {
  const totalTiered = counts.definite + counts.probable + counts.possible + counts.weak;
  const flaggedPct = totalRows > 0 ? (totalFlagged / totalRows) * 100 : 0;
  const cleanPct = 100 - flaggedPct;

  const maxTierCount = Math.max(1, ...TIERS.map((t) => counts[t.key]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Horizontal stacked evidence-bar */}
      <SectionCard title="Match Distribution" description={`${totalTiered.toLocaleString()} ${totalTiered === 1 ? 'customer' : 'customers'} with match signals`}>
        {totalTiered === 0 ? (
          <div className="flex items-center justify-center h-[120px] rounded-md" style={{ background: 'var(--surface-overlay)' }}>
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
                style={{ background: 'var(--sev-clear-fill)', color: 'var(--sev-clear)' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-caption font-medium" style={{ color: 'var(--ink-primary)' }}>No match signals found</p>
              <p className="text-caption" style={{ color: 'var(--ink-tertiary)' }}>All transactions appear clean</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Stacked horizontal bar */}
            <div className="h-5 w-full rounded-sm overflow-hidden flex" style={{ background: 'var(--surface-muted)' }}>
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
                    <span style={{ color: 'var(--ink-secondary)' }}>{t.label}</span>
                  </span>
                  <span className="font-mono" style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                    {counts[t.key].toLocaleString()}
                    <span style={{ color: 'var(--ink-tertiary)' }}>
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
        <div className="grid grid-cols-4 gap-3 h-[160px] items-end">
          {TIERS.map((tier) => {
            const value = counts[tier.key];
            const height = Math.max(8, (value / maxTierCount) * 128);
            return (
              <div key={tier.key} className="flex h-full min-w-0 flex-col justify-end gap-2">
                <div className="flex h-32 items-end rounded-sm" style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-border)' }}>
                  <div
                    className="w-full rounded-sm"
                    title={`${tier.label}: ${value.toLocaleString()}`}
                    style={{ height, background: tier.color }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-caption font-mono" style={{ color: 'var(--ink-primary)' }}>{value.toLocaleString()}</p>
                  <p className="text-[10px] uppercase truncate" style={{ color: 'var(--ink-tertiary)' }}>{tier.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Overall composition — full width */}
      <SectionCard title="Overall Composition" className="md:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 text-caption" style={{ color: 'var(--ink-tertiary)' }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'var(--copper-bright)' }} />
              With signals {flaggedPct.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'var(--sev-clear)' }} />
              No signals {cleanPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-sm overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
          <div
            className="h-full rounded-sm transition-all duration-500"
            style={{ width: `${flaggedPct}%`, background: 'var(--copper-bright)' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-caption" style={{ color: 'var(--ink-tertiary)' }}>
            {totalFlagged.toLocaleString()} with signals of {totalRows.toLocaleString()} transactions
          </span>
          <span className="text-caption font-mono" style={{ color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
            {(totalRows - totalFlagged).toLocaleString()} no signals
          </span>
        </div>
      </SectionCard>
    </div>
  );
}
