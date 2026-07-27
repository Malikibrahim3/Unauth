'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This dispute could not be loaded" description="Its amount, status, evidence, and linked cases are unchanged." reset={reset} digest={error.digest} fallbackHref="/customers" />; }
