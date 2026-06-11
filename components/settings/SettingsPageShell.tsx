import type { ReactNode } from 'react';
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
  eyebrow = 'Settings',
  breadcrumbs,
  primaryAction,
  secondaryActions,
  meta,
  tabs,
  children,
  className,
}: SettingsPageShellProps) {
  const resolvedBreadcrumbs =
    breadcrumbs ??
    [
      { label: 'Settings', href: '/settings/account' },
      { label: title },
    ];

  return (
    <div className={cn('min-w-0', className)}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        breadcrumbs={resolvedBreadcrumbs}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        meta={meta}
        tabs={tabs}
      />
      <div className="mx-auto w-full max-w-[1120px] px-5 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
