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
    <div className={`grid ${colsClassName} divide-x divide-[var(--surface-border)] border-b border-[var(--surface-border)] bg-[var(--surface-base)]`}>
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <p className="t-label text-[var(--ink-tertiary)]">{item.label}</p>
          <p className="mt-1 t-display text-[var(--ink-primary)] num">{item.value}</p>
          {item.hint && <p className="mt-1 t-caption text-[var(--ink-tertiary)]">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}
