'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function ImportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OperationalRouteError
      title="Import workspace could not be loaded"
      description="No file was imported and no mapped or validated record was changed."
      reset={reset}
      digest={error.digest}
      fallbackHref="/sources/connected"
    />
  );
}
