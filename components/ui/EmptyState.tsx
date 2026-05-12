import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional extra content rendered below the action (e.g. a keyboard shortcuts legend). */
  footer?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, footer, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-[var(--space-8)] px-[var(--space-6)]',
        className,
      )}
    >
      {icon && (
        <span className="text-[var(--text-tertiary)] w-6 h-6 mb-[var(--space-4)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className="text-h2 text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p
          className="mt-[var(--space-2)] text-small text-[var(--text-secondary)]"
          style={{ maxWidth: 360 }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-[var(--space-5)]">{action}</div>}
      {footer && <div className="mt-[var(--space-5)] w-full">{footer}</div>}
    </div>
  );
}
