'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Flows could not be loaded" description="Your flows and their published versions are unchanged." reset={reset} digest={error.digest} stateId="flows-error" />; }
