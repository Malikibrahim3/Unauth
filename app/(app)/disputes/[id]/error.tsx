'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This dispute could not be loaded" description="Retry its amount, lifecycle, evidence, and connected payout cases." reset={reset} fallbackHref="/customers" />; }
