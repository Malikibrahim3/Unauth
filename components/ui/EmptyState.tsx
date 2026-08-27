import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateBaseProps {
  /**
   * Layout variant:
   * - `default`  centered vertical stack
   * - `compact`  left-aligned inline pattern for empty tables / lists
   * - `hero`     full-width onboarding content area
   */
  icon?: ReactNode;
  title: string;
  /** Optional extra content rendered below the action. */
  footer?: ReactNode;
  className?: string;
}

type EmptyStateProps = EmptyStateBaseProps & (
  | {
      variant?: 'default' | 'compact';
      description: string;
      action: Exclude<ReactNode, null | undefined | boolean>;
      children?: never;
    }
  | {
      variant: 'hero';
      description?: string;
      action?: ReactNode;
      /** Hero variant: arbitrary content rendered in the body area. */
      children: ReactNode;
    }
);

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
        <h2
          className="ua-empty-state__compact-title ua-text-working-title flex items-center gap-2"
        >
          {icon ? (
            <span aria-hidden="true" className="ua-empty-state__compact-icon shrink-0">
              {icon}
            </span>
          ) : (
            <span aria-hidden="true" className="ua-empty-state__compact-icon ua-empty-state__compact-icon--dot shrink-0 rounded-full" />
          )}
          {title}
        </h2>
        {description && (
          <p className="ua-empty-state__description text-caption mt-1">
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

  // default — centered full-page. A thin skin over OperationalState's
  // `empty` contract (§17.5/§17.6): same role/data-kind, so a shared query
  // (`[role="status"][data-kind="empty"]`) finds every empty state in the
  // product, whether it renders through here or through OperationalState
  // directly. The icon/footer/hero layout stays — those are real content
  // OperationalState has no slot for, and 20 real routes render through them.
  return (
    <div
      className={cn(
        'ua-empty-state flex flex-col items-center justify-center text-center py-[var(--uo-route-space-10)] px-[var(--uo-route-space-6)]',
        className,
      )}
      role="status"
      data-kind="empty"
    >
      {icon ? (
        <span
          className="ua-empty-visual mb-[var(--uo-route-space-4)] flex h-10 w-10 items-center justify-center rounded-[var(--uo-route-radius-control)]"
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <h3 className="ua-empty-state__title text-h2">
        {title}
      </h3>
      {description && (
        <p className="ua-empty-state__description mt-[var(--uo-route-space-2)] text-small">
          {description}
        </p>
      )}
      {action && <div className="mt-[var(--uo-route-space-5)]">{action}</div>}
      {footer && <div className="mt-[var(--uo-route-space-5)] w-full">{footer}</div>}
    </div>
  );
}
