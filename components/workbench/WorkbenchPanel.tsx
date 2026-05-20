import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WorkbenchPanelProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WorkbenchPanel({ title, subtitle, actions, children, className }: WorkbenchPanelProps) {
  return (
    <section
      className={cn('overflow-hidden border', className)}
      style={{ borderColor: 'var(--border-default)', borderRadius: 4, background: 'var(--bg-surface)' }}
    >
      <header
        className="flex items-center justify-between gap-3 border-b px-4 py-2"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}
      >
        <div className="min-w-0">
          <p className="text-overline" style={{ color: 'var(--text-muted)' }}>{title}</p>
          {subtitle && <p className="text-caption mt-0.5 truncate" style={{ color: 'var(--text-subtle)' }}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}
