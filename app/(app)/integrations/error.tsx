'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function IntegrationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="Integration health is unavailable" description="No connection state was changed. Retry this resource while preserving the current route." reset={reset} />;
}
