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

const RAIL_CARD_KEYS = ['rail-card-1', 'rail-card-2'] as const;
const RAIL_ROW_WIDTHS = ['100%', '72%', '54%'];

/** Placeholder for the KeyInsightCallout band (icon chip + one sentence). */
function InsightBandSkeleton() {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--ua-radius-card)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <Bone className="h-[30px] w-[30px] rounded-[var(--ua-radius-card)]" />
      <Bone className="h-3 w-64 max-w-full" />
    </div>
  );
}

/** Placeholder for the 310px side-summary rail (a stack of small summary cards). */
function RailSkeleton() {
  return (
    <aside className={styles.rail}>
      <div className="grid gap-2.5">
        {RAIL_CARD_KEYS.map((cardKey) => (
          <div
            key={cardKey}
            style={{
              padding: 14,
              border: '1px solid var(--border)',
              borderRadius: 'var(--ua-radius-card)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <Bone className="h-3 w-24" />
            <div className="mt-3 space-y-2">
              {RAIL_ROW_WIDTHS.map((width) => (
                <div key={width} className="flex items-center justify-between gap-3">
                  <Bone className="h-3" style={{ width }} />
                  <Bone className="h-3 w-8" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function WorkbenchPageSkeleton({
  showNav = true,
  showActions = true,
  kpiCount = 5,
  kpiColsClassName = 'grid-cols-2 md:grid-cols-5',
  showActionBar = false,
  visualVariant,
  showInsight = false,
  showRail = false,
  children,
}: {
  showNav?: boolean;
  showActions?: boolean;
  kpiCount?: number;
  kpiColsClassName?: string;
  showActionBar?: boolean;
  visualVariant?: AuthChartSkeletonVariant;
  /** Reserve the KeyInsightCallout band (operational pages that dropped their hero chart). */
  showInsight?: boolean;
  /** Reserve the two-column side-summary rail. */
  showRail?: boolean;
  children: ReactNode;
}) {
  const mainPanel = <section className={cn(styles.panel, styles.mainPanel)}>{children}</section>;
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

          {showInsight ? <InsightBandSkeleton /> : null}
          {visualVariant ? <AuthenticatedChartSkeleton variant={visualVariant} /> : null}

          {showActionBar ? (
            <div className={styles.toolbar}>
              <Bone className="h-8 w-full max-w-md" />
              <Bone className="h-8 w-24" />
              <Bone className="h-8 w-20" />
            </div>
          ) : null}

          {showRail ? (
            <div className={styles.workbenchGrid}>
              {mainPanel}
              <RailSkeleton />
            </div>
          ) : (
            mainPanel
          )}
        </div>
      </div>
    </div>
  );
}
