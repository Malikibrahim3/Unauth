'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This support ticket could not be loaded" description="The ticket details, its source, evidence, and linked cases are unchanged." reset={reset} digest={error.digest} fallbackHref="/customers" stateId="ticket-error" />; }
