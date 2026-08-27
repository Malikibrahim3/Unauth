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
      title="This loss could not be loaded"
      description="The financial formula, attribution, evidence, recovery links, and activity are unchanged."
      reset={reset}
      digest={error.digest}
      fallbackHref="/financials/losses"
      stateId="loss-detail-error"
    />
  );
}
