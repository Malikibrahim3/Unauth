'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This refund could not be loaded" description="Retry its exact amount, source provenance, and connected payout cases." reset={reset} fallbackHref="/customers" />; }
