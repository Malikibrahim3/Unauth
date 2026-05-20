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

export function WorkbenchPage({
  title,
  subtitle,
  navItems,
  activeNavKey,
  actions,
  kpiStrip,
  actionBar,
  main,
  rail,
  footer,
}: WorkbenchPageProps) {
  return (
    <div className="p-4 md:p-6">
      <section
        className="overflow-hidden border"
        style={{
          borderColor: 'var(--border-default)',
          borderRadius: 4,
          background: 'var(--bg-surface)',
          boxShadow: '0 1px 0 rgba(26,24,20,0.04), 0 20px 54px -42px rgba(26,24,20,0.35)',
        }}
      >
        <header
          className="border-b px-4 py-3"
          style={{
            borderColor: 'var(--border-default)',
            background: 'linear-gradient(180deg, var(--bg-surface) 0%, #FCF9F2 100%)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {navItems && activeNavKey
                ? (
                  <>
                    <WorkbenchNav items={navItems} activeKey={activeNavKey} />
                    {subtitle && <p className="text-body-sm mt-2" style={{ color: 'var(--text-muted)', maxWidth: 720 }}>{subtitle}</p>}
                  </>
                ) : (
                  <>
                    <h1 className="text-heading-lg" style={{ color: 'var(--text)', fontFamily: 'var(--font-serif), Georgia, serif' }}>{title}</h1>
                    {subtitle && <p className="text-body-sm mt-1" style={{ color: 'var(--text-muted)', maxWidth: 720 }}>{subtitle}</p>}
                  </>
                )
              }
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>

        {kpiStrip}
        {actionBar}

        {rail ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border-r" style={{ borderColor: 'var(--border-default)' }}>{main}</div>
            <aside>{rail}</aside>
          </div>
        ) : (
          <div>{main}</div>
        )}

        {footer && <footer className="border-t px-4 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>{footer}</footer>}
      </section>
    </div>
  );
}
