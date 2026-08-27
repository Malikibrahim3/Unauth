'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function IntegrationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="Source health is unavailable" description="Connection state, credentials and imported records are unchanged." reset={reset} digest={error.digest} fallbackHref="/overview" />;
}
