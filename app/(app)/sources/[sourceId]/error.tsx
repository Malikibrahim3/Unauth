'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function ProviderIntegrationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OperationalRouteError
      title="This provider connection could not be loaded"
      description="Connection status, source coverage, freshness, and provider configuration are unchanged."
      reset={reset}
      digest={error.digest}
      fallbackHref="/sources/connected"
    />
  );
}
