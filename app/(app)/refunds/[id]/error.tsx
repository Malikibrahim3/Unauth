'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This refund could not be loaded" description="The refund amount, its source, and linked cases are unchanged." reset={reset} digest={error.digest} fallbackHref="/customers" stateId="refund-error" />; }
