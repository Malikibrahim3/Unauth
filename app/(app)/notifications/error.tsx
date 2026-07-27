'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="Notifications could not be loaded" description="Your read state and notification preferences are unchanged." reset={reset} digest={error.digest} />; }
