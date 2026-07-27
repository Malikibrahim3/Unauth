'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Recoveries could not be loaded" description="No evidence, correspondence, or recovery amount was changed." reset={reset} digest={error.digest} />; }
