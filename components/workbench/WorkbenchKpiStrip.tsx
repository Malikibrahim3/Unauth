import { PAGE_SHELL_INNER_CLASS, PAGE_SECTION_DIVIDER_STYLE } from '@/components/ui/pageShellStyles';
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
    <div className={PAGE_SHELL_INNER_CLASS} style={PAGE_SECTION_DIVIDER_STYLE}>
      <div className={`grid ${colsClassName}`}>
      {items.map((item, idx) => (
        <div
          key={item.label}
          className="min-w-0 py-3 pr-4 md:py-4 md:pr-6"
          style={{
            borderRightColor: 'var(--border)',
            borderRightWidth: idx === items.length - 1 ? 0 : 1,
            borderRightStyle: idx === items.length - 1 ? 'none' : 'solid',
          }}
        >
          <p className="text-overline truncate" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
          <p
            className="mt-1 truncate"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {item.value}
          </p>
          {item.hint && <p className="text-meta mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>{item.hint}</p>}
        </div>
      ))}
      </div>
    </div>
  );
}
