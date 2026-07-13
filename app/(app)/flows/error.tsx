'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Flows could not be loaded" description="Published automation remains unchanged. Retry the versioned flow workspace." reset={reset} />; }
