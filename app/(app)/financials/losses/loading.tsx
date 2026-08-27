import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function Loading() {
  return (
    <OperationalRouteSkeleton
      title="Loading loss ledger and review queue"
      rows={7}
      kpiCount={4}
      visualVariant="combo"
    />
  );
}
