import { type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];
  meta?: ReactNode;
  tabs?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  meta,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-[var(--space-7)]',
        'pt-[var(--space-6)]',
        tabs ? 'pb-0' : 'pb-[var(--space-5)]',
        className,
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-[var(--space-2)]">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 text-small text-[var(--text-tertiary)]">
              {i > 0 && <span aria-hidden="true" className="select-none">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[var(--text-secondary)] transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--text-secondary)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-[var(--space-5)]">
        <div className="min-w-0">
          <h1 className="text-display text-[var(--text-primary)] truncate">{title}</h1>
          {subtitle && (
            <p className="mt-[var(--space-1)] text-small text-[var(--text-tertiary)]">{subtitle}</p>
          )}
        </div>
        {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
          <div className="flex items-center gap-[var(--space-2)] shrink-0">
            {secondaryActions?.map((action, i) => <span key={i}>{action}</span>)}
            {primaryAction}
          </div>
        )}
      </div>

      {/* Meta row */}
      {meta && (
        <div className="flex items-center gap-[var(--space-2)] mt-[var(--space-2)] flex-wrap">
          {meta}
        </div>
      )}

      {/* Tabs row */}
      {tabs && (
        <div className="mt-[var(--space-5)]">
          {tabs}
        </div>
      )}
    </header>
  );
}
