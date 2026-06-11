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
  const renderNow = Date.now();

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
          Summary
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4">
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-secondary)' }}>First seen</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--data-date)' }}>{formatDateMode(flaggedAt, 'table')}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-secondary)' }}>Orders</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{orders}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-secondary)' }}>Order value</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{formatCurrencyCompact(exposure)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-secondary)' }}>Cadence</div>
          <div className="mt-1 flex items-center gap-1">
            {barCells(cadence).map((active, index) => (
              <span key={index} style={{ width: 12, height: 8, borderRadius: 1, background: active ? 'var(--accent)' : 'var(--surface-sunken)' }} />
            ))}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Activity cadence: each square = 1 week
          </div>
        </div>
        <div title={formatDateMode(lastSeen, 'timestamp')}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-secondary)' }}>Last seen</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--data-date)' }}>{formatDateMode(lastSeen, 'recent', renderNow)}</div>
        </div>
      </div>
      <div
        className="flex gap-1 px-4 pb-4 cursor-help"
        title="Weekly order activity — each bar is one week of orders and claims in your data"
      >
        {density.map((value, index) => (
          <span
            key={index}
            title={`Week ${index + 1}`}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 2,
              background: value > 0 ? 'var(--text-tertiary)' : 'var(--surface-sunken)',
              opacity: value > 0 ? 0.9 : 0.45,
            }}
          />
        ))}
      </div>
    </div>
  );
}
