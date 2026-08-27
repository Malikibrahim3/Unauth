'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Work could not be loaded" description="Assignments, deadlines, and task state are unchanged." reset={reset} digest={error.digest} stateId="work-error" />; }
