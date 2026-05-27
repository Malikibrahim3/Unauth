import { type ReactNode } from 'react';

export interface WorkbenchKpiItem {
  label: string;
  value: ReactNode;
  hint?: string;
}

interface WorkbenchKpiStripProps {
  items: WorkbenchKpiItem[];
  colsClassName?: string;
}

export function WorkbenchKpiStrip({ items, colsClassName = 'grid-cols-2 md:grid-cols-5' }: WorkbenchKpiStripProps) {
  return (
    <div
      className={`grid ${colsClassName} border-b`}
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
    >
      {items.map((item, idx) => (
        <div
          key={item.label}
          className="min-w-0 px-3 py-3 md:px-4"
          style={{
            borderRightColor: 'var(--surface-border)',
            borderRightWidth: idx === items.length - 1 ? 0 : 1,
            borderRightStyle: idx === items.length - 1 ? 'none' : 'solid',
          }}
        >
          <p className="t-label mt-1 truncate" style={{ color: 'var(--ink-tertiary)' }}>{item.label}</p>
          <p className="t-display mt-1 num truncate" style={{ color: String(item.value).includes('£') || String(item.value).includes('$') ? 'var(--data-currency)' : 'var(--data-score)' }}>{item.value}</p>
          {item.hint && <p className="t-caption mt-1 truncate" style={{ color: 'var(--ink-tertiary)' }}>{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}
