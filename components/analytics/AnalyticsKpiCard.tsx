import type { ReactNode } from 'react';

export interface AnalyticsKpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  /** Optional colour dot / badge */
  accent?: ReactNode;
  /** Compact removes padding */
  compact?: boolean;
}

/**
 * Minimal KPI tile. No trailing helper paragraphs — label + number only.
 * Use `hint` for one short delta string if needed.
 */
export function AnalyticsKpiCard({ label, value, hint, accent, compact }: AnalyticsKpiCardProps) {
  return (
    <div
      className={compact ? 'px-3 py-2.5' : 'px-4 py-3'}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {accent}
        <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
      <div className="num text-[1.45rem] font-semibold leading-none tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {hint && (
        <div className="t-caption mt-1" style={{ color: 'var(--text-tertiary)' }}>{hint}</div>
      )}
    </div>
  );
}
