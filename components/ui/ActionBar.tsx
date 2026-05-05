import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  leftActions?: ReactNode;
  primaryAction: ReactNode;
  className?: string;
}

export function ActionBar({ leftActions, primaryAction, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-[var(--space-2)]',
        'px-[var(--space-5)] py-[var(--space-3)]',
        'bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]',
        className,
      )}
    >
      <div className="flex items-center gap-[var(--space-2)]">
        {leftActions}
      </div>
      <div>{primaryAction}</div>
    </div>
  );
}
