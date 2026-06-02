import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailPageShellProps {
  /** Back link shown above the title */
  backHref?: string;
  backLabel?: string;
  /** Optional eyebrow breadcrumb text (non-linked) */
  eyebrow?: string;
  title: string;
  /** Short line below the title — filename, date, identifier */
  subtitle?: ReactNode;
  /** Badge or status pill next to the title */
  statusBadge?: ReactNode;
  /** Metric strip rendered below the header */
  metricStrip?: ReactNode;
  /** Primary action button(s) */
  actions?: ReactNode;
  /** Tabs rendered flush at the bottom of the header */
  tabs?: ReactNode;
  /** Main content area */
  children: ReactNode;
  /** Optional fixed-width right rail */
  rail?: ReactNode;
  className?: string;
}

export function DetailPageShell({
  backHref,
  backLabel,
  eyebrow,
  title,
  subtitle,
  statusBadge,
  metricStrip,
  actions,
  tabs,
  children,
  rail,
  className,
}: DetailPageShellProps) {
  return (
    <div className={cn('p-3 md:p-5', className)}>
      <div
        className="overflow-hidden border"
        style={{
          borderColor: 'var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-raised)',
          boxShadow: 'var(--shadow-1)',
        }}
      >
        {/* Header */}
        <header
          className="border-b"
          style={{
            borderColor: 'var(--surface-border)',
            background: 'var(--surface-raised)',
            padding: tabs ? '16px 16px 0' : '14px 16px',
          }}
        >
          {/* Back / eyebrow row */}
          {(backHref || eyebrow) && (
            <div className="flex items-center gap-2 mb-2" style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
              {backHref && (
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1 transition-colors hover:text-[var(--ink-secondary)]"
                  style={{ color: 'inherit' }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {backLabel ?? 'Back'}
                </Link>
              )}
              {backHref && eyebrow && (
                <span aria-hidden="true" style={{ opacity: 0.4 }}>›</span>
              )}
              {eyebrow && <span>{eyebrow}</span>}
            </div>
          )}

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="t-heading min-w-0 truncate" style={{ color: 'var(--ink-primary)' }}>
                  {title}
                </h1>
                {statusBadge}
              </div>
              {subtitle && (
                <p className="mt-1 text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
            )}
          </div>

          {/* Tabs — flush to header bottom edge */}
          {tabs && <div className="mt-3">{tabs}</div>}
        </header>

        {/* Metric strip */}
        {metricStrip}

        {/* Body */}
        {rail ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div
              className="min-w-0 border-r"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              {children}
            </div>
            <aside className="min-w-0">{rail}</aside>
          </div>
        ) : (
          <div>{children}</div>
        )}
      </div>
    </div>
  );
}
