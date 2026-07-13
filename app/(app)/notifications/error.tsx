'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Notifications could not be loaded" description="Read state and preferences were not changed. Retry the operational inbox." reset={reset} />; }
