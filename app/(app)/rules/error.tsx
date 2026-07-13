'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Rules could not be loaded" description="Published versions remain active. Retry the versioned rule workspace." reset={reset} />; }
