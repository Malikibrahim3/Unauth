'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OperationalRouteError title="Financial reports could not be loaded" description="The report scope, financial stages, supporting records and export data are unchanged." reset={reset} digest={error.digest} fallbackHref="/financials/losses" stateId="reports-error" />;
}
