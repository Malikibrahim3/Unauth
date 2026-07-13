'use client';
import { OperationalRouteError } from '@/components/states/OperationalRouteError';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationalRouteError title="This support ticket could not be loaded" description="Retry its source facts, provenance, evidence, and connected cases." reset={reset} fallbackHref="/customers" />; }
