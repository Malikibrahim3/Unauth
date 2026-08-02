import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function Loading() {
  return (
    <OperationalRouteSkeleton
      title="Loading loss trend and ledger"
      rows={7}
      kpiCount={4}
      visualVariant="combo"
    />
  );
}
