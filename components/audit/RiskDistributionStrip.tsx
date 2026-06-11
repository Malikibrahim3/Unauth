'use client';

import type { ReactNode } from 'react';

interface RiskDistributionStripProps {
  definite: number;
  probable: number;
  candidate: number;
  weak: number;
}

const ROWS = [
  { key: 'definite', label: 'Definite', color: 'var(--neutral)' },
  { key: 'probable', label: 'Probable', color: 'var(--warning)' },
  { key: 'candidate', label: 'Possible', color: 'var(--sev-neutral)' },
  { key: 'weak', label: 'Weak', color: 'var(--text-tertiary)' },
] as const;

export function RiskDistributionStrip({ definite, probable, candidate, weak }: RiskDistributionStripProps) {
  const values = { definite, probable, candidate, weak };
  const total = definite + probable + candidate + weak;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="t-label" style={{ color: 'var(--text-secondary)' }}>
            Matched profiles
          </div>
          <div className="t-score mt-2 num" style={{ color: 'var(--text-primary)' }}>
            {total.toLocaleString('en-US')}
          </div>
        </div>
      </div>

      <svg className="mt-4 h-3 w-full overflow-visible" viewBox="0 0 100 12" preserveAspectRatio="none" aria-label="Confidence distribution">
        <rect width="100" height="12" rx="1" fill="var(--surface-sunken)" />
        {ROWS.reduce<{ x: number; nodes: ReactNode[] }>((acc, row) => {
          const value = values[row.key];
          const width = total > 0 ? (value / total) * 100 : 0;
          if (width > 0) {
            acc.nodes.push(<rect key={row.key} x={acc.x} width={width} height="12" fill={row.color} />);
          }
          acc.x += width;
          return acc;
        }, { x: 0, nodes: [] }).nodes}
      </svg>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {ROWS.map((row) => {
          const value = values[row.key];
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={row.key} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: row.color }} />
                <span className="t-label truncate" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
              </span>
              <span className="t-mono shrink-0" style={{ color: 'var(--text-secondary)' }}>{value} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
