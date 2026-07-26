import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function IntegrationsLoading() {
  return <OperationalRouteSkeleton title="Loading integrations" rows={6} kpiCount={0} showInsight={false} showRail={false} />;
}
