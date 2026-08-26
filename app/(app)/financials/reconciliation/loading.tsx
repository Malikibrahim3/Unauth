import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function ReconciliationLoading() {
  return <OperationalRouteSkeleton title="Loading source and ledger comparison" rows={7} kpiCount={4} showRail />;
}
