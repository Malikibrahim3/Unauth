import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function CustomerProfileLoading() {
  return <OperationalRouteSkeleton title="Loading customer profile" rows={5} detail />;
}
