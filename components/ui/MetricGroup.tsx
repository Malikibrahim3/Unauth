import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MetricGroupItem {
  label: string;
  value: ReactNode;
  description?: ReactNode;
}

export function MetricGroup({ items, className }: { items: MetricGroupItem[]; className?: string }) {
  return (
    <div className={cn('grid overflow-hidden rounded-[var(--ua-radius-card)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] grid-cols-2 md:grid-cols-4', className)}>
      {items.map((item, index) => (
        <div key={item.label} className={cn('min-w-0 px-4 py-3 md:px-5', index > 0 && 'border-l border-[var(--ua-border-default)]')}>
          <p className="text-xs font-medium leading-4 text-[var(--ua-text-secondary)]">{item.label}</p>
          <p className="mt-1 text-[23px] font-semibold leading-7 tracking-[-0.01em] tabular-nums text-[var(--ua-text-primary)]">{item.value}</p>
          {item.description ? <p className="mt-0.5 text-xs leading-4 text-[var(--ua-text-tertiary)]">{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}
