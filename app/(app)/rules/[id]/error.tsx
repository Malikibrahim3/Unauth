'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This rule could not be loaded" description="No draft or published version was changed. Retry the composer and immutable history." reset={reset} fallbackHref="/rules" />; }
