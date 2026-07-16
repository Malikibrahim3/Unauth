import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function LoadingLoss() {
  return <OperationalRouteSkeleton title="Loading loss record" rows={5} detail />;
}
