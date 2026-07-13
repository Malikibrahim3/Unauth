import { formatCurrencyCompact, formatDateMode } from '@/lib/utils/format';

interface CaseSummaryStripProps {
  flaggedAt: string;
  orders: number;
  exposure: number;
  lastSeen: string;
  density: number[];
}

export default function CaseSummaryStrip({
  flaggedAt,
  orders,
  exposure,
  lastSeen,
  density,
}: CaseSummaryStripProps) {
  const renderNow = Date.now();
  const activeWeeks = density.filter((count) => count > 0).length;
  const averagePerActiveWeek = activeWeeks > 0 ? orders / activeWeeks : 0;

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
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{averagePerActiveWeek.toFixed(1)} orders / active week</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{activeWeeks} active of {density.length} observed weeks</div>
        </div>
        <div title={formatDateMode(lastSeen, 'timestamp')}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-secondary)' }}>Last seen</div>
          <div className="mt-1 num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--data-date)' }}>{formatDateMode(lastSeen, 'recent', renderNow)}</div>
        </div>
      </div>
    </div>
  );
}
