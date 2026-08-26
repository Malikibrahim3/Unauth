import { WorkbenchPageSkeleton } from '@/components/navigation/skeletons/WorkbenchPageSkeleton';
import type { AuthChartSkeletonVariant } from '@/components/navigation/skeletons/AuthenticatedChartSkeleton';
import { Bone, TableSkeleton } from '@/components/navigation/skeletons/primitives';
import { LoadingRecovery } from '@/components/navigation/skeletons/LoadingRecovery';

export function OperationalRouteSkeleton({
  title = "Loading workspace",
  rows = 6,
  detail = false,
  detailVariant,
  kpiCount = 4,
  visualVariant,
  showInsight = false,
  showRail = false,
}: {
  title?: string;
  rows?: number;
  detail?: boolean;
  /** Route-family geometry for a detail page that has a named primary visual. */
  detailVariant?: 'recovery';
  kpiCount?: number;
  visualVariant?: AuthChartSkeletonVariant;
  /** Reserve the KeyInsightCallout band (operational pages without a hero chart). */
  showInsight?: boolean;
  /** Reserve the two-column side-summary rail. */
  showRail?: boolean;
}) {
  const stateId = detail ? 'operational-detail-loading-skeleton' : 'operational-list-board-loading-skeleton';
  if (detail) {
    if (detailVariant === 'recovery') {
      return (
        <div className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pb-6 pt-4" aria-busy="true" aria-label={title} data-state-id={stateId}>
          <div className="ua-loading-context"><p className="ua-loading-context__scope">Current workspace · object route preserved</p><p className="ua-loading-context__title">{title}</p><Bone className="h-3 w-96 max-w-full" /></div>
          <section className="ua-focal-panel grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="border-l-2 border-[var(--uo-route-border-default)] pl-3"><Bone className="h-3 w-20" /><Bone className="mt-2 h-5 w-24" /><Bone className="mt-2 h-3 w-28" /></div>)}</section>
          <section className="ua-focal-panel p-4"><Bone className="h-5 w-36" /><Bone className="mt-2 h-3 w-96 max-w-full" /><div className="mt-4 space-y-2">{Array.from({ length: 4 }, (_, index) => <Bone key={index} className="h-10 w-full" />)}</div></section>
          <section className="rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-subtle)] p-4"><Bone className="h-5 w-60" /><div className="mt-4 grid gap-4 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-3"><Bone className="h-4 w-24" /><Bone className="h-3 w-full" /><Bone className="h-3 w-4/5" /></div>)}</div></section>
          <LoadingRecovery title={title} />
        </div>
      );
    }
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-3 px-3 pb-6 pt-4 sm:px-5" aria-busy="true" aria-label={title} data-state-id={stateId}>
        <div className="ua-loading-context"><p className="ua-loading-context__scope">Current workspace · object route preserved</p><p className="ua-loading-context__title">{title}</p><Bone className="h-3 w-72 max-w-full" /></div>
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-3">{Array.from({ length: Math.max(3, rows) }, (_, index) => <Bone key={index} className="h-16 w-full border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-primary)]" />)}</div>
          <Bone className="h-64 w-full border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-primary)]" />
        </div>
        <LoadingRecovery title={title} />
      </div>
    );
  }

  return (
    <div data-state-id={stateId}>
    <WorkbenchPageSkeleton
      kpiCount={kpiCount}
      visualVariant={visualVariant}
      showInsight={showInsight}
      showRail={showRail}
      showActionBar
      title={title}
    >
      <div className="p-3">
        <TableSkeleton columns={[{ width: '34%' }, { width: '18%' }, { width: '18%' }, { width: '18%' }, { width: '12%' }]} rows={rows} />
      </div>
    </WorkbenchPageSkeleton>
    </div>
  );
}
