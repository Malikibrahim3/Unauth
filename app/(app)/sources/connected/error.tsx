'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function IntegrationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="Integration health is unavailable" description="None of your connections were changed." reset={reset} digest={error.digest} />;
}
