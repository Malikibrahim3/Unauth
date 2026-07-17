import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';
import { Bone } from './primitives';
import { AuthenticatedChartSkeleton, type AuthChartSkeletonVariant } from './AuthenticatedChartSkeleton';

const KPI_SLOT_KEYS = [
  'kpi-slot-1',
  'kpi-slot-2',
  'kpi-slot-3',
  'kpi-slot-4',
  'kpi-slot-5',
  'kpi-slot-6',
  'kpi-slot-7',
  'kpi-slot-8',
] as const;

export function WorkbenchPageSkeleton({
  showNav = true,
  showActions = true,
  kpiCount = 5,
  kpiColsClassName = 'grid-cols-2 md:grid-cols-5',
  showActionBar = false,
  visualVariant,
  children,
}: {
  showNav?: boolean;
  showActions?: boolean;
  kpiCount?: number;
  kpiColsClassName?: string;
  showActionBar?: boolean;
  visualVariant?: AuthChartSkeletonVariant;
  children: ReactNode;
}) {
  return (
    <div role="status" className="animate-pulse" aria-busy="true" aria-label="Loading page">
      <header className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className="min-w-0 space-y-2">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-5 w-40" />
            {showNav ? <Bone className="h-3 w-80 max-w-full" /> : null}
          </div>
          {showActions ? <Bone className="h-8 w-28" /> : null}
        </div>
      </header>

      <div className={styles.pageBody}>
        <div className={styles.workbenchStack}>
          {kpiCount > 0 ? (
            <div className={cn(styles.kpiStrip, kpiColsClassName)}>
              {KPI_SLOT_KEYS.slice(0, kpiCount).map((slotKey) => (
                <div key={slotKey} className={styles.kpiItem}>
                  <Bone className="h-2.5 w-20" />
                  <Bone className="mt-2 h-5 w-16" />
                  <Bone className="mt-2 h-2.5 w-24 max-w-full" />
                </div>
              ))}
            </div>
          ) : null}

          {visualVariant ? <AuthenticatedChartSkeleton variant={visualVariant} /> : null}

          {showActionBar ? (
            <div className={styles.toolbar}>
              <Bone className="h-8 w-full max-w-md" />
              <Bone className="h-8 w-24" />
              <Bone className="h-8 w-20" />
            </div>
          ) : null}

          <section className={cn(styles.panel, styles.mainPanel)}>{children}</section>
        </div>
      </div>
    </div>
  );
}
