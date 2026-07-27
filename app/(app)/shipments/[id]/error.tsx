'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This shipment could not be loaded" description="The tracking history, its source, and the linked order are unchanged." reset={reset} digest={error.digest} fallbackHref="/customers" />; }
