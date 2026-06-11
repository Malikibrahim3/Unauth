import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PAGE_BAND_STYLE,
  PAGE_EYEBROW_STYLE,
  PAGE_HEADER_STYLE,
  PAGE_SHELL_INNER_CLASS,
  PAGE_SUBTITLE_STYLE,
  PAGE_TITLE_STYLE,
} from '@/components/ui/pageShellStyles';

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
    <div className={cn(className)} style={PAGE_BAND_STYLE}>
      <div>
        {/* Header */}
        <header
          className={PAGE_SHELL_INNER_CLASS}
          style={{
            ...PAGE_HEADER_STYLE,
            paddingBottom: tabs ? 0 : undefined,
          }}
        >
          {/* Back / eyebrow row */}
          {(backHref || eyebrow) && (
            <div className="mb-3 flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {backHref && (
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1 transition-colors hover:text-[var(--text-secondary)]"
                  style={{ color: 'inherit' }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {backLabel ?? 'Back'}
                </Link>
              )}
              {backHref && eyebrow && (
                <span aria-hidden="true" style={{ opacity: 0.4 }}>›</span>
              )}
              {eyebrow && <span style={PAGE_EYEBROW_STYLE}>{eyebrow}</span>}
            </div>
          )}

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="t-page-title min-w-0 truncate" style={PAGE_TITLE_STYLE}>
                  {title}
                </h1>
                {statusBadge}
              </div>
              {subtitle && (
                <p className="mt-2 text-body-sm" style={PAGE_SUBTITLE_STYLE}>
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
            )}
          </div>

          {/* Tabs — flush to header bottom edge */}
          {tabs && <div className="mt-5">{tabs}</div>}
        </header>

        {/* Metric strip */}
        {metricStrip}

        {/* Body */}
        {rail ? (
          <div className={`${PAGE_SHELL_INNER_CLASS} grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start`}>
            <div className="min-w-0">
              {children}
            </div>
            <aside className="min-w-0">{rail}</aside>
          </div>
        ) : (
          <div className={PAGE_SHELL_INNER_CLASS}>{children}</div>
        )}
      </div>
    </div>
  );
}
