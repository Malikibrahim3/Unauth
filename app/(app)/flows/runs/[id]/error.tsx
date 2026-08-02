'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="This flow run could not be loaded" description="No workflow execution record was changed." reset={reset} fallbackHref="/flows/runs" digest={error.digest} />;
}
