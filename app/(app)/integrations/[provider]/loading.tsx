import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';

export default function ProviderIntegrationLoading() {
  return (
    <OperationalRouteSkeleton
      title="Loading provider connection"
      rows={4}
      detail
    />
  );
}
