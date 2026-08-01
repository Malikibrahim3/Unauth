import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function Loading() {
  return <OperationalRouteSkeleton title="Loading flow runs" rows={6} kpiCount={0} />;
}
