import type { ReactNode } from 'react';
import Link from 'next/link';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader, type Breadcrumb } from '@/components/ui/PageHeader';

interface SettingsPageShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];
  meta?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsPageShell({
  title,
  subtitle,
  eyebrow,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  meta,
  tabs,
  children,
  className,
}: SettingsPageShellProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        meta={meta}
        tabs={tabs}
      />
      <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_230px] lg:px-8">
        <div className="min-w-0">{children}</div>
        <aside className="hidden space-y-3 lg:block" aria-label="Settings guidance">
          <div className="ua-section-panel rounded-lg p-4">
            <span className="ua-identity-tile flex h-9 w-9 items-center justify-center text-[var(--brand-deep)]"><ShieldCheck size={17} aria-hidden="true" /></span>
            <h2 className="mt-3 text-sm font-semibold">Workspace controls</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">Changes are scoped to this workspace. Sensitive actions and configuration updates remain available in the audit trail.</p>
          </div>
          <Link href="/help" className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
            <HelpCircle size={15} aria-hidden="true" />
            Settings help
          </Link>
        </aside>
      </div>
    </div>
  );
}
