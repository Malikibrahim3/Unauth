import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function AuthenticatedRouteLoading() {
  return <OperationalRouteSkeleton title="Loading workspace" rows={6} />;
}
