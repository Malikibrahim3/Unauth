import type { ReactNode } from 'react';
import Link from 'next/link';
import { HelpCircle, ShieldCheck } from 'lucide-react';
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
        <div className={styles.settingsGrid}>
          <div className={styles.settingsMain}>{children}</div>
          <aside className={styles.guidanceStack} aria-label="Settings guidance">
          <div className={styles.guidanceCard}>
            <span className={styles.guidanceIcon}><ShieldCheck size={15} aria-hidden="true" /></span>
            <h2>Workspace controls</h2>
            <p>Changes are scoped to this workspace. Sensitive actions and configuration updates remain available in the audit trail.</p>
          </div>
          <Link href="/help" className={styles.guidanceLink}>
            <HelpCircle size={15} aria-hidden="true" />
            Settings help
          </Link>
        </aside>
        </div>
      </div>
    </div>
  );
}
