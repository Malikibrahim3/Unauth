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
  eyebrow?: string;
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
  eyebrow,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  meta,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(className)}
      style={{
        background: 'var(--bg-canvas)',
        borderBottom: '1px solid var(--border-default)',
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: tabs ? 20 : 16,
        paddingBottom: tabs ? 0 : 16,
      }}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span
              key={i}
              className="flex items-center gap-1"
              style={{ fontSize: 11, color: 'var(--text-subtle)' }}
            >
              {i > 0 && <span aria-hidden="true" style={{ opacity: 0.4 }}>›</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:underline transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: 'var(--text-subtle)' }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Eyebrow overline */}
      {eyebrow && (
        <div
          className="mb-1"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            lineHeight: 1,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: 999,
              background: 'var(--accent)',
              marginRight: 7,
              verticalAlign: '1px',
            }}
          />
          {eyebrow}
        </div>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <h1
            className="truncate"
            style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
          <div className="flex items-center gap-2 shrink-0">
            {secondaryActions?.map((action, i) => <span key={i}>{action}</span>)}
            {primaryAction}
          </div>
        )}
      </div>

      {/* Meta row */}
      {meta && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {meta}
        </div>
      )}

      {/* Tabs row */}
      {tabs && (
        <div className="mt-4">
          {tabs}
        </div>
      )}
    </header>
  );
}
