'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function ReportRecordsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OperationalRouteError
      title="Report records could not be loaded"
      description="The selected report scope, financial records, and export data are unchanged."
      reset={reset}
      digest={error.digest}
      fallbackHref="/financials/reports"
      stateId="report-records-error"
    />
  );
}
