'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Recoveries could not be loaded" description="No evidence, correspondence, recovery amount or external outcome was changed." reset={reset} digest={error.digest} fallbackHref="/financials/losses" stateId="recovery-board-error" />; }
