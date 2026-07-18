import { WorkbenchPageSkeleton } from '@/components/navigation/skeletons/WorkbenchPageSkeleton';
import type { AuthChartSkeletonVariant } from '@/components/navigation/skeletons/AuthenticatedChartSkeleton';
import { Bone, TableSkeleton } from '@/components/navigation/skeletons/primitives';

export function OperationalRouteSkeleton({
  title = "Loading workspace",
  rows = 6,
  detail = false,
  kpiCount = 4,
  visualVariant,
  showInsight = false,
  showRail = false,
}: {
  title?: string;
  rows?: number;
  detail?: boolean;
  kpiCount?: number;
  visualVariant?: AuthChartSkeletonVariant;
  /** Reserve the KeyInsightCallout band (operational pages without a hero chart). */
  showInsight?: boolean;
  /** Reserve the two-column side-summary rail. */
  showRail?: boolean;
}) {
  if (detail) {
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-3 px-3 pb-6 pt-4 sm:px-5" aria-busy="true" aria-label={title}>
        <div className="space-y-2"><Bone className="h-2.5 w-20" /><Bone className="h-5 w-44" /><Bone className="h-3 w-72 max-w-full" /></div>
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-3">{Array.from({ length: Math.max(3, rows) }, (_, index) => <Bone key={index} className="h-16 w-full border border-[var(--border-muted)] bg-[var(--surface)]" />)}</div>
          <Bone className="h-64 w-full border border-[var(--border-muted)] bg-[var(--surface)]" />
        </div>
      </div>
    );
  }

  return (
    <WorkbenchPageSkeleton
      kpiCount={kpiCount}
      visualVariant={visualVariant}
      showInsight={showInsight}
      showRail={showRail}
      showActionBar
    >
      <div className="p-3">
        <TableSkeleton columns={[{ width: '34%' }, { width: '18%' }, { width: '18%' }, { width: '18%' }, { width: '12%' }]} rows={rows} />
      </div>
    </WorkbenchPageSkeleton>
  );
}
