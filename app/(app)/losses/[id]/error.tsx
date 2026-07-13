'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This loss could not be loaded" description="The source, adjustments, recovery links, and audit trail remain unchanged." reset={reset} fallbackHref="/losses" />; }
