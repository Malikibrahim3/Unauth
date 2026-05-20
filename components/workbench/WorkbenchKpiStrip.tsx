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
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
    >
      {items.map((item, idx) => (
        <div
          key={item.label}
          className="px-3 py-3 md:px-4"
          style={{
            borderRightColor: 'var(--border-default)',
            borderRightWidth: idx === items.length - 1 ? 0 : 1,
            borderRightStyle: idx === items.length - 1 ? 'none' : 'solid',
          }}
        >
          <p className="text-overline" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
          <p className="text-mono-lg mt-1 num" style={{ color: 'var(--text)' }}>{item.value}</p>
          {item.hint && <p className="text-caption mt-1" style={{ color: 'var(--text-subtle)' }}>{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}
