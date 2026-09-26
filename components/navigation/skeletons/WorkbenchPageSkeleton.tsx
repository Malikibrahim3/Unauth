import type { ReactNode } from 'react';
import { Bone } from './primitives';
import { AuthenticatedChartSkeleton, type AuthChartSkeletonVariant } from './AuthenticatedChartSkeleton';
import { LoadingRecovery } from './LoadingRecovery';

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
        border: '1px solid #e4e3e0',
        borderRadius: '12px',
        background: '#fff',
        boxShadow: 'none',
      }}
    >
      <Bone className="h-[30px] w-[30px] rounded-[12px]" />
      <Bone className="h-3 w-64 max-w-full" />
    </div>
  );
}

/** Placeholder for the 310px side-summary rail (a stack of small summary cards). */
function RailSkeleton() {
  return (
    <aside style={{ minWidth: 0 }}>
      <div className="grid gap-2.5">
        {RAIL_CARD_KEYS.map((cardKey) => (
          <div
            key={cardKey}
            style={{
              padding: 14,
              border: '1px solid #e4e3e0',
              borderRadius: '12px',
              background: '#fff',
              boxShadow: 'none',
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
  title = 'workspace page',
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
  /** Truthful route identity while final values remain unavailable. */
  title?: string;
  children: ReactNode;
}) {
  const panelStyle = { minWidth: 0, overflow: 'hidden', borderRadius: 12, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' } as const;
  const mainPanel = <section style={panelStyle}>{children}</section>;
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title}`} data-skeleton-variant="workbench">
      <header style={{ width: '100%', padding: '12px 22px 11px', borderBottom: '1px solid #eae8e5', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
          <div className="min-w-0 space-y-2">
            <p className="flex items-center gap-3">Current workspace · route scope preserved</p>
            <p className="font-semibold text-[#1c1f23]">Preparing {title}</p>
            {showNav ? <Bone className="h-3 w-80 max-w-full" /> : null}
          </div>
          {showActions ? <Bone className="h-8 w-28" /> : null}
        </div>
      </header>

      <div style={{ width: '100%', minHeight: 0, padding: '14px 22px 18px', background: '#fbfaf8' }}>
        <div style={{ display: 'grid', minWidth: 0, gap: 14, overflowX: 'hidden' }}>
          {kpiCount > 0 ? (
            <div className={kpiColsClassName} style={{ display: 'grid', borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
              {KPI_SLOT_KEYS.slice(0, kpiCount).map((slotKey) => (
                <div key={slotKey} style={{ minWidth: 0, padding: '14px 16px', borderRight: '1px solid #eae8e5' }}>
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
            <div style={{ display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Bone className="h-8 w-full max-w-md" />
              <Bone className="h-8 w-24" />
              <Bone className="h-8 w-20" />
            </div>
          ) : null}

          {showRail ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 14 }}>
              {mainPanel}
              <RailSkeleton />
            </div>
          ) : (
            mainPanel
          )}
        </div>
      </div>
      <LoadingRecovery title={title} />
    </div>
  );
}
