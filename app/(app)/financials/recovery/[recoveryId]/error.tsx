'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This recovery could not be loaded" description="The recovery amounts, evidence, correspondence and append-only activity are unchanged." reset={reset} digest={error.digest} fallbackHref="/financials/recovery" stateId="recovery-detail-error" />; }
