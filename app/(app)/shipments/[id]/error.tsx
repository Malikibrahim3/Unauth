'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This shipment could not be loaded" description="Retry its tracking lifecycle, source provenance, and connected order." reset={reset} fallbackHref="/customers" />; }
