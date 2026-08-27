import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function CustomersLoading() {
  return <div data-state-id="customers-registry-loading"><OperationalRouteSkeleton title="Loading customer registry" rows={8} /></div>;
}
