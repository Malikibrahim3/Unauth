'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This return could not be loaded" description="The return's request, receipt, and inspection details are unchanged." reset={reset} digest={error.digest} fallbackHref="/customers" stateId="return-error" />; }
