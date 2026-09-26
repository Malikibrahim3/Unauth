import { SuppliedVisualBody as LoadingDetailBody } from '@/components/visual-authority/generated/Loading-Detail-Clean';
import { SuppliedVisualBody as LoadingRegistryBody } from '@/components/visual-authority/generated/Loading-Registry-Clean';

export function OperationalRouteSkeleton({
  title = 'Loading workspace',
  detail = false,
  stateId,
}: {
  title?: string;
  rows?: number;
  detail?: boolean;
  detailVariant?: 'recovery';
  kpiCount?: number;
  visualVariant?: 'line' | 'bar' | 'stacked' | 'donut';
  showInsight?: boolean;
  showRail?: boolean;
  stateId?: string;
}) {
  const resolvedStateId = stateId ?? (detail ? 'operational-detail-loading-skeleton' : 'operational-list-board-loading-skeleton');
  return (
    <div
      data-state-id={resolvedStateId}
      aria-busy="true"
      aria-label={title}
      style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}
    >
      {detail ? <LoadingDetailBody/> : <LoadingRegistryBody/>}
    </div>
  );
}
