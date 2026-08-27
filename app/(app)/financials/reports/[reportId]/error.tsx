'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function NamedReportError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="This report could not be loaded" description="Its saved identity, run history, scope and supporting financial records are unchanged." reset={reset} digest={error.digest} fallbackHref="/financials/reports" stateId="named-report-error" />;
}
