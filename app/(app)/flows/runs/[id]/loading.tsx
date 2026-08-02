import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function Loading() {
  return <OperationalRouteSkeleton title="Loading flow run" rows={4} detail />;
}
