'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Rules could not be loaded" description="Your published rules are still active and unchanged." reset={reset} digest={error.digest} />; }
