'use client';

import { ErrorBoundaryUI } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      title="Overview unavailable"
      description="We could not load the financial overview. Try again, or continue to the work queue."
      fallbackHref="/work"
      stateId="overview-error"
    />
  );
}
