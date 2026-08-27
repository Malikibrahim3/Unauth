'use client';

import { ErrorBoundaryUI } from '@/components/ui';

export default function CustomerEvidenceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundaryUI error={error} reset={reset} title="Customer evidence workspace unavailable" stateId="evidence-package-error" />;
}
