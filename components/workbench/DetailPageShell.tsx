import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

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
  // The chrome breadcrumb (AppHeader) already renders "Back → title" navigation
  // once the title override below is set, so an in-page breadcrumb would just
  // duplicate it. Keep only the eyebrow kicker.
  return (
    <div className={cn(className)}>
      <SetBreadcrumbLabel label={title} />
      <AuthenticatedPageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={statusBadge || actions ? <>{statusBadge}{actions}</> : undefined}
        tabs={tabs}
        capabilityId="detail.heading"
      />
      <div className={styles.pageBody}>
        <div className={styles.workbenchStack}>
          {metricStrip}
          {rail ? (
            <div className={styles.workbenchGrid}>
              <div className="min-w-0">{children}</div>
              <aside className={styles.rail}>{rail}</aside>
            </div>
          ) : (
            <div className="min-w-0">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}
