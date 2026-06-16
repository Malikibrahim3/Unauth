import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /**
   * Layout variant:
   * - `default`  → centered vertical stack (icon, title, description, action, footer)
   * - `compact`  → left-aligned inline pattern for empty tables / lists
   * - `hero`     → full-width onboarding hero (passes children through as content area)
   */
  variant?: 'default' | 'compact' | 'hero';
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional extra content rendered below the action. */
  footer?: ReactNode;
  className?: string;
  /** hero variant: arbitrary content rendered in the body area */
  children?: ReactNode;
}

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  footer,
  className,
  children,
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('px-4 py-8', className)}>
        <p
          className="flex items-center gap-2 text-body-sm font-semibold"
          style={{ color: 'var(--text)' }}
        >
          {icon ? (
            <span aria-hidden="true" className="shrink-0" style={{ color: 'var(--accent)' }}>
              {icon}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--accent)' }}
            />
          )}
          {title}
        </p>
        {description && (
          <p className="text-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={cn('w-full', className)}>
        {children}
      </div>
    );
  }

  // default — centered full-page
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-[var(--space-8)] px-[var(--space-6)]',
        className,
      )}
    >
      {icon && (
        <span
          className="mb-[var(--space-4)] w-6 h-6"
          style={{ color: 'var(--text-tertiary)' }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <h3 className="text-h2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p
          className="mt-[var(--space-2)] text-small"
          style={{ maxWidth: 360, color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-[var(--space-5)]">{action}</div>}
      {footer && <div className="mt-[var(--space-5)] w-full">{footer}</div>}
    </div>
  );
}
