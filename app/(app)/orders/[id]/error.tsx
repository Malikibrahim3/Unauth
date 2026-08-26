'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This order could not be loaded" description="The order details and linked records are unchanged." reset={reset} digest={error.digest} fallbackHref="/customers" stateId="order-error" />; }
