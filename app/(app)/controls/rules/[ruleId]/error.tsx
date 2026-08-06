'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This rule could not be loaded" description="No draft or published version was changed." reset={reset} digest={error.digest} fallbackHref="/controls/rules" />; }
