'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This recovery could not be loaded" description="Its financial invariant, evidence, and correspondence remain unchanged." reset={reset} fallbackHref="/recoveries" />; }
