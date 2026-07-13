'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Work could not be loaded" description="Assignments, due dates, and task state were not changed. Retry this merchant-scoped work queue." reset={reset} />; }
