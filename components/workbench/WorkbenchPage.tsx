import { type ReactNode } from 'react';
import { type WorkbenchNavItem } from './WorkbenchNav';
import { WorkbenchKpiStrip, type WorkbenchKpiItem } from './WorkbenchKpiStrip';
import { WorkbenchActionBar } from './WorkbenchActionBar';
import { PageFrame } from '@/components/ui/PageFrame';
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
  mainSurface?: 'panel' | 'open';
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
  mainSurface = 'panel',
  rail,
  footer,
}: WorkbenchPageProps) {
  // Column geometry belongs to the adaptive KPI group (§5.3), not to a
  // page-level class ladder that produced blank cells at 1, 3, and 7+ metrics.
  const resolvedKpiStrip = kpiItems ? <WorkbenchKpiStrip items={kpiItems} /> : kpiStrip;
  const resolvedActionBar =
    actionBarLeft != null || actionBarMiddle != null || actionBarRight != null ? (
      <WorkbenchActionBar left={actionBarLeft} middle={actionBarMiddle} right={actionBarRight} />
    ) : (
      actionBar
    );

  // The Workbench shell is now a thin adapter over the canonical §5.1 frame
  // (LP-CMP-01): it maps its prop names onto PageFrame slots and keeps the
  // rail grid + main-panel wrapping it owns. Output is unchanged for existing
  // consumers — the header, body regions, and CSS classes are identical.
  const wrappedMain = mainSurface === 'open' ? (
    <div className={styles.openMain} data-capability-id="page.primary-content">{main}</div>
  ) : (
    <AuthenticatedPanel className={styles.mainPanel} capabilityId="page.primary-content">{main}</AuthenticatedPanel>
  );
  const mainRegion = rail ? (
    <div className={styles.workbenchGrid}>
      {wrappedMain}
      <aside className={styles.rail}>{rail}</aside>
    </div>
  ) : (
    wrappedMain
  );

  return (
    <PageFrame
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={actions}
      headerCapabilityId="page.heading"
      metrics={resolvedKpiStrip}
      primaryVisual={primaryVisual}
      toolbar={resolvedActionBar}
      footer={footer}
    >
      {mainRegion}
    </PageFrame>
  );
}
