'use client';

import { formatCurrencyCompact, formatDateMode } from '@/lib/utils/format';

interface CaseSummaryStripProps {
  flaggedAt: string;
  orders: number;
  exposure: number;
  cadence: number;
  lastSeen: string;
  density: number[];
}

function barCells(count: number) {
  return Array.from({ length: 5 }, (_, index) => index < count);
}

export default function CaseSummaryStrip({
  flaggedAt,
  orders,
  exposure,
  cadence,
  lastSeen,
  density,
}: CaseSummaryStripProps) {
  const maxDensity = Math.max(...density, 1);

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid var(--border-default)', borderRadius: 4 }}>
      <div style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-default)', padding: '10px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: 1 }}>
          <span style={{ color: '#7B2D26', marginRight: 5 }}>§</span>
          Case At A Glance
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4">
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Flagged</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: '#1A1814' }}>{formatDateMode(flaggedAt, 'table')}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Orders</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: '#1A1814' }}>{orders}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Exposure</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: '#1A1814' }}>{formatCurrencyCompact(exposure)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cadence</div>
          <div className="mt-1 flex items-center gap-1">
            {barCells(cadence).map((active, index) => (
              <span key={index} style={{ width: 12, height: 8, borderRadius: 1, background: active ? '#1A1814' : '#D2C9B5' }} />
            ))}
          </div>
        </div>
        <div title={formatDateMode(lastSeen, 'timestamp')}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Last Seen</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: '#1A1814' }}>{formatDateMode(lastSeen, 'recent')}</div>
        </div>
      </div>
      <div className="flex gap-1 px-4 pb-4">
        {density.map((value, index) => (
          <span
            key={index}
            title={`Week ${index + 1}`}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 2,
              background: `rgba(123, 45, 38, ${0.15 + (value / maxDensity) * 0.85})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
