import { type ReactNode } from 'react';
import { WorkbenchNav, type WorkbenchNavItem } from './WorkbenchNav';

interface WorkbenchPageProps {
  title: string;
  subtitle?: string;
  navItems?: WorkbenchNavItem[];
  activeNavKey?: string;
  actions?: ReactNode;
  kpiStrip?: ReactNode;
  actionBar?: ReactNode;
  main: ReactNode;
  rail?: ReactNode;
  footer?: ReactNode;
}

export function WorkbenchPage({ title, subtitle, navItems, activeNavKey, actions, kpiStrip, actionBar, main, rail, footer }: WorkbenchPageProps) {
  return (
    <div className="p-4 md:p-6">
      <section className="overflow-hidden rounded-md border border-[var(--surface-border)] bg-[var(--surface-raised)]">
        <header className="border-b border-[var(--surface-border)] px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {navItems && activeNavKey ? (
                <>
                  <WorkbenchNav items={navItems} activeKey={activeNavKey} />
                  {subtitle && <p className="mt-2 max-w-3xl t-body text-[var(--ink-secondary)]">{subtitle}</p>}
                </>
              ) : (
                <>
                  <h1 className="t-heading text-[var(--ink-primary)]">{title}</h1>
                  {subtitle && <p className="mt-1 max-w-3xl t-body text-[var(--ink-secondary)]">{subtitle}</p>}
                </>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>
        {kpiStrip}
        {actionBar}
        {rail ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border-r border-[var(--surface-border)]">{main}</div>
            <aside>{rail}</aside>
          </div>
        ) : (
          <div>{main}</div>
        )}
        {footer && <footer className="border-t border-[var(--surface-border)] bg-[var(--surface-overlay)] px-4 py-2">{footer}</footer>}
      </section>
    </div>
  );
}
