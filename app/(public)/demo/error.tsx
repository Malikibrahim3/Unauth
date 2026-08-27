'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function DemoError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="ua-app ua-auth-surface grid min-h-screen place-content-center p-6" data-state-id="demo-error" role="alert">
      <section className="max-w-xl rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-6">
        <h1 className="ua-text-section-title">The synthetic walkthrough could not load</h1>
        <p className="ua-text-body mt-2 text-[var(--ua-text-secondary)]">No provider request, payout, decision, or recovery action was performed.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Button type="button" onClick={reset}>Try again</Button><Link className="ua-button ua-button--secondary" href="/landing">Product overview</Link></div>
      </section>
    </main>
  );
}
