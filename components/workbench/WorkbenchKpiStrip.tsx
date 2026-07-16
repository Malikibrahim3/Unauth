import { PAGE_SHELL_INNER_CLASS } from '@/components/ui/pageShellStyles';
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
    <div className={PAGE_SHELL_INNER_CLASS}>
      <div className={`ua-focal-panel grid overflow-hidden rounded-[var(--ua-radius-card)] border border-[var(--ua-border-default)] ${colsClassName}`}>
      {items.map((item, idx) => (
        <div
          key={item.label}
          className="ua-metric-card min-w-0 px-4 py-3 md:px-5 md:py-4"
          style={{
            borderRightColor: 'var(--border)',
            borderRightWidth: idx === items.length - 1 ? 0 : 1,
            borderRightStyle: idx === items.length - 1 ? 'none' : 'solid',
          }}
        >
          <p className="text-xs font-medium leading-4" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
          <p
            className="mt-1 truncate"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 23,
              fontWeight: 600,
              lineHeight: 1.2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {item.value}
          </p>
          {item.hint && <p className="text-xs mt-0.5 leading-4" style={{ color: 'var(--text-tertiary)' }}>{item.hint}</p>}
        </div>
      ))}
      </div>
    </div>
  );
}
