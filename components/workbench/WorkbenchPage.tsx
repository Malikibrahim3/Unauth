import { type ReactNode } from 'react';
import { type WorkbenchNavItem } from './WorkbenchNav';
import { WorkbenchKpiStrip, type WorkbenchKpiItem } from './WorkbenchKpiStrip';
import { WorkbenchActionBar } from './WorkbenchActionBar';
import {
  PAGE_BAND_STYLE,
  PAGE_EYEBROW_STYLE,
  PAGE_HEADER_STYLE,
  PAGE_SHELL_INNER_CLASS,
  PAGE_SUBTITLE_STYLE,
  PAGE_TITLE_STYLE,
} from '@/components/ui/pageShellStyles';

interface WorkbenchPageProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Deprecated: the cross-page section nav is no longer rendered (the app sidebar owns it). */
  navItems?: WorkbenchNavItem[];
  /** Deprecated: see navItems. */
  activeNavKey?: string;
  actions?: ReactNode;
  /** Prefer kpiItems over kpiStrip to avoid passing JSX as a prop. */
  kpiItems?: WorkbenchKpiItem[];
  kpiStrip?: ReactNode;
  actionBarLeft?: ReactNode;
  actionBarMiddle?: ReactNode;
  actionBarRight?: ReactNode;
  actionBar?: ReactNode;
  main: ReactNode;
  rail?: ReactNode;
  footer?: ReactNode;
}

export function WorkbenchPage({
  eyebrow,
  title,
  subtitle,
  actions,
  kpiItems,
  kpiStrip,
  actionBarLeft,
  actionBarMiddle,
  actionBarRight,
  actionBar,
  main,
  rail,
  footer,
}: WorkbenchPageProps) {
  const kpiColsClass = kpiItems
    ? kpiItems.length <= 4
      ? 'grid-cols-2 md:grid-cols-4'
      : kpiItems.length === 5
        ? 'grid-cols-2 md:grid-cols-5'
        : kpiItems.length === 6
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
    : undefined;
  const resolvedKpiStrip = kpiItems
    ? <WorkbenchKpiStrip items={kpiItems} colsClassName={kpiColsClass} />
    : kpiStrip;
  const resolvedActionBar =
    actionBarLeft != null || actionBarMiddle != null || actionBarRight != null ? (
      <WorkbenchActionBar left={actionBarLeft} middle={actionBarMiddle} right={actionBarRight} />
    ) : (
      actionBar
    );

  return (
    <div style={PAGE_BAND_STYLE}>
      <section>
        <header
          className={PAGE_SHELL_INNER_CLASS}
          style={{ ...PAGE_HEADER_STYLE, background: 'var(--surface)' }}
        >
          {eyebrow ? (
            <div className="mb-2" style={PAGE_EYEBROW_STYLE}>
              {eyebrow}
            </div>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="t-page-title" style={PAGE_TITLE_STYLE}>
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-body-sm" style={PAGE_SUBTITLE_STYLE}>
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>

        {resolvedKpiStrip}
        {resolvedActionBar}

        {rail ? (
          <div className={`${PAGE_SHELL_INNER_CLASS} grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start`}>
            <div className="min-w-0">{main}</div>
            <aside>{rail}</aside>
          </div>
        ) : (
          <div className={PAGE_SHELL_INNER_CLASS}>{main}</div>
        )}

        {footer && <footer className={PAGE_SHELL_INNER_CLASS} style={PAGE_HEADER_STYLE}>{footer}</footer>}
      </section>
    </div>
  );
}
