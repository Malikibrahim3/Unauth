import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Breadcrumb } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

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

/**
 * Instrument Grade configuration-document shell.
 *
 * The settings family is "Header → grouped local navigation → 680–820px form →
 * contextual help only when specific". Grouped navigation is owned by the
 * settings layout (`SettingsNav`); this shell renders the header and a single
 * readable form column capped at 820px.
 *
 * The prior shell hung a fixed "Workspace controls" guidance card plus a
 * "Settings help" link on every page — a generic rail repeated across ~12
 * settings routes, which §5.5 explicitly removes. Contextual help now belongs
 * inline within a page's own content, and only when it is specific to that page.
 */
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
      <AuthenticatedPageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={
          primaryAction || secondaryActions?.length
            ? <>{secondaryActions}{primaryAction}</>
            : undefined
        }
        meta={meta}
        tabs={tabs}
        capabilityId="settings.heading"
      />
      <div className={styles.pageBody}>
        <div className="ua-settings-form">{children}</div>
      </div>
    </div>
  );
}
