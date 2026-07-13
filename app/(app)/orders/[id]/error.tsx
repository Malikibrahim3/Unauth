'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This order could not be loaded" description="Retry its merchant-scoped facts, provenance, and connected records." reset={reset} fallbackHref="/customers" />; }
