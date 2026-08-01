'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function RecoveryRulesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OperationalRouteError
      title="Recovery rules could not be loaded"
      description="Partner ownership, evidence requirements, and active recovery policies are unchanged."
      reset={reset}
      digest={error.digest}
      fallbackHref="/rules"
    />
  );
}
