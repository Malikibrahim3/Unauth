'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OperationalRouteError
      title="Cases could not be loaded"
      description="No case state, evidence, or merchant decision was changed. Try again to restore the queue and selected preview."
      reset={reset}
      digest={error.digest}
      fallbackHref="/dashboard"
    />
  );
}
