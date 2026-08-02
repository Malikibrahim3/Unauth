'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function ShipBobSelectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OperationalRouteError
      title="ShipBob channels could not be loaded"
      description="No channel was selected and the current connection is unchanged."
      reset={reset}
      digest={error.digest}
      fallbackHref="/integrations/shipbob"
    />
  );
}
