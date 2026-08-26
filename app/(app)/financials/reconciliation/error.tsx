'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function ReconciliationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="Reconciliation could not be loaded" description="No source relationship, confirmed ledger entry, resolution or dismissal was changed." reset={reset} digest={error.digest} fallbackHref="/financials/losses" stateId="reconciliation-error" />;
}
