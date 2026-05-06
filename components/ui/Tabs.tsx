'use client';
import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('flex items-end gap-[var(--space-6)] border-b border-[var(--border-subtle)]', className)}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              'inline-flex items-center gap-[var(--space-2)] pb-[var(--space-3)] text-body transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] rounded-sm',
              active
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-500)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border-b-2 border-transparent',
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-[var(--radius-pill)] text-[11px] font-semibold num',
                  active
                    ? 'bg-[var(--accent-100)] text-[var(--accent-700)]'
                    : 'bg-[var(--bg-surface-alt)] text-[var(--text-tertiary)]',
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
