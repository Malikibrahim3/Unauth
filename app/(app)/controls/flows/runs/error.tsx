'use client';

import { OperationalRouteError } from '@/components/states/OperationalRouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="Flow runs could not be loaded" description="No recorded run or workflow definition was changed." reset={reset} fallbackHref="/controls/flows" digest={error.digest} />;
}
