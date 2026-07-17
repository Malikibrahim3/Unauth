import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';
export default function CustomerProfileLoading() {
  return <OperationalRouteSkeleton title="Loading customer record" rows={6} detail />;
}
