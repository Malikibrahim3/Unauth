'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PublicShell } from '@/components/system/PublicShell';

export default function PublicErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PublicShell surfaceId="public-route-error">
      <section className="mx-auto grid min-h-[65dvh] w-full max-w-3xl place-content-center px-4" role="alert">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--ua-text-primary)]">This page could not load</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ua-text-secondary)]">No account, provider, or billing action was performed. Retry the page or return to the product overview.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Button type="button" onClick={reset}>Try again</Button><Link className="ua-button ua-button--secondary" href="/landing">Product overview</Link></div>
      </section>
    </PublicShell>
  );
}
