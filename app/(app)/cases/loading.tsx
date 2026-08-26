import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function CasesLoading() {
  return <div data-state-id="cases-registry-loading"><OperationalRouteSkeleton title="Loading cases registry and selected preview" rows={8} showRail /></div>;
}
