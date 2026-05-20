'use client';

import { Badge } from '@/components/ui/Badge';

interface RiskDistributionStripProps {
  definite: number;
  probable: number;
  candidate: number;
  weak: number;
}

const ROWS = [
  { key: 'definite', label: 'Definite', color: '#1A1814' },
  { key: 'probable', label: 'Probable', color: '#7B2D26' },
  { key: 'candidate', label: 'Candidate', color: '#4A4640' },
  { key: 'weak', label: 'Weak', color: '#C8C0AB' },
] as const;

export function RiskDistributionStrip({ definite, probable, candidate, weak }: RiskDistributionStripProps) {
  const values = { definite, probable, candidate, weak };
  const total = definite + probable + candidate + weak;
  const max = Math.max(definite, probable, candidate, weak, 1);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: 1 }}>
            <span aria-hidden="true" className="ua-section-dot" />
            Likely Identity Links
          </div>
          <div className="mt-2 num" style={{ fontSize: 28, fontWeight: 600, color: '#1A1814', lineHeight: 1 }}>
            {total.toLocaleString('en-GB')}
          </div>
        </div>
        <Badge tone={total > 0 ? 'danger' : 'neutral'} variant="subtle">Anchor metric</Badge>
      </div>

      <div className="space-y-2">
        {ROWS.map((row) => {
          const value = values[row.key];
          const width = `${(value / max) * 100}%`;
          return (
            <div key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="flex items-center gap-2">
                <div style={{ width: 120, background: '#F2EDE3', borderRadius: 2, overflow: 'hidden', height: 10 }}>
                  <div style={{ width, maxWidth: '100%', height: '100%', background: row.color }} />
                </div>
                <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {row.label}
                </span>
              </div>
              <span className="num" style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#1A1814' }}>{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
