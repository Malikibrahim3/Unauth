import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function CaseDetailLoading() {
  return (
    <OperationalRouteSkeleton
      title="Loading case detail, evidence, and decision"
      rows={6}
      detail
    />
  );
}
