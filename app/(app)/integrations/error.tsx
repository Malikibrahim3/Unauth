'use client';

import { Button, Card } from '@/components/ui';

export default function IntegrationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-4xl p-4 md:p-6"><Card unstyled variant="flat" className="p-6"><h1 className="text-lg font-semibold">Integration health is unavailable</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">No connection state was changed. Retry this resource while preserving the current route.</p><Button className="mt-4" variant="primary" onClick={reset}>Retry integrations</Button></Card></div>;
}
