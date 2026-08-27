'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function CaseDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OperationalRouteError
      title="Case detail could not be loaded"
      description="No evidence, recommendation, investigation, merchant decision, outcome, or audit history was changed."
      reset={reset}
      digest={error.digest}
      fallbackHref="/cases"
      stateId="case-error"
    />
  );
}
