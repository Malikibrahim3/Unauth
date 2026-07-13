'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="The loss ledger could not be loaded" description="No financial record was changed. Retry the canonical loss and adjustment read model." reset={reset} />; }
