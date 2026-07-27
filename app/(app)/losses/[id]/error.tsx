'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This loss could not be loaded" description="The source, adjustments, recovery links, and history are unchanged." reset={reset} digest={error.digest} fallbackHref="/losses" />; }
