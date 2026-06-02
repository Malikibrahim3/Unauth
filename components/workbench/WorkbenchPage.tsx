import { type ReactNode } from 'react';
import { WorkbenchNav, type WorkbenchNavItem } from './WorkbenchNav';
import { WorkbenchKpiStrip, type WorkbenchKpiItem } from './WorkbenchKpiStrip';
import { WorkbenchActionBar } from './WorkbenchActionBar';

interface WorkbenchPageProps {
  title: string;
  subtitle?: string;
  navItems?: WorkbenchNavItem[];
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
  title,
  subtitle,
  navItems,
  activeNavKey,
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
  const resolvedKpiStrip = kpiItems ? <WorkbenchKpiStrip items={kpiItems} /> : kpiStrip;
  const resolvedActionBar =
    actionBarLeft != null || actionBarMiddle != null || actionBarRight != null ? (
      <WorkbenchActionBar left={actionBarLeft} middle={actionBarMiddle} right={actionBarRight} />
    ) : (
      actionBar
    );

  return (
    <div className="p-3 md:p-5">
      <section
        className="overflow-hidden border"
        style={{
          borderColor: 'var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-raised)',
          boxShadow: 'var(--shadow-1)',
        }}
      >
        <header
          className="border-b px-4 py-3"
          style={{
            borderColor: 'var(--surface-border)',
            background: 'var(--surface-raised)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>{title}</h1>
              {navItems && activeNavKey && (
                <div className="mt-2">
                  <WorkbenchNav items={navItems} activeKey={activeNavKey} />
                </div>
              )}
              {subtitle && (
                <p
                  className="text-body-sm mt-2"
                  style={{ color: 'var(--ink-secondary)', maxWidth: 720 }}
                >
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
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border-r" style={{ borderColor: 'var(--surface-border)' }}>{main}</div>
            <aside>{rail}</aside>
          </div>
        ) : (
          <div>{main}</div>
        )}

        {footer && <footer className="border-t px-4 py-2" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}>{footer}</footer>}
      </section>
    </div>
  );
}
