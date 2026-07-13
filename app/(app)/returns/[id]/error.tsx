'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This return could not be loaded" description="Retry its request, receipt, inspection, and disposition lifecycle." reset={reset} fallbackHref="/customers" />; }
