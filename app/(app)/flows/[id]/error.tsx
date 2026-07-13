'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This flow could not be loaded" description="No trigger, condition, action, or published version was changed." reset={reset} fallbackHref="/flows" />; }
