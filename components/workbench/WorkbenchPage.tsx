import { type ReactNode } from 'react';
import { type WorkbenchNavItem } from './WorkbenchNav';
import { WorkbenchKpiStrip, type WorkbenchKpiItem } from './WorkbenchKpiStrip';
import { WorkbenchActionBar } from './WorkbenchActionBar';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

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
  primaryVisual?: ReactNode;
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
  primaryVisual,
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
    <div>
      <AuthenticatedPageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={actions}
        capabilityId="page.heading"
      />
      <div className={styles.pageBody}>
        <div className={styles.workbenchStack}>
          {resolvedKpiStrip}
          {primaryVisual}
          {resolvedActionBar}
          {rail ? (
            <div className={styles.workbenchGrid}>
              <AuthenticatedPanel className={styles.mainPanel} capabilityId="page.primary-content">{main}</AuthenticatedPanel>
              <aside className={styles.rail}>{rail}</aside>
            </div>
          ) : (
            <AuthenticatedPanel className={styles.mainPanel} capabilityId="page.primary-content">{main}</AuthenticatedPanel>
          )}
          {footer ? <footer className={styles.footer}>{footer}</footer> : null}
        </div>
      </div>
    </div>
  );
}
