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
      title="Losses could not be loaded"
      description="No financial record, attribution, recovery, or write-off state was changed."
      reset={reset}
      digest={error.digest}
      fallbackHref="/overview"
    />
  );
}
