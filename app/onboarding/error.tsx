'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

export default function OnboardingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="ua-auth-surface min-h-screen bg-[var(--uo-route-canvas)] text-[var(--uo-route-text-primary)]" data-surface-id="workspace-onboarding" data-state-id="onboarding-error">
      <header className="flex h-12 items-center justify-between border-b border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-shell)] px-4 sm:px-5">
        <UnauthLogo kind="lockup" tone="auto" height={20} alt="Unauth" />
        <span className="text-[length:var(--uo-route-text-metadata-size)] font-semibold text-[var(--uo-route-text-tertiary)]">Workspace setup</span>
      </header>
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[440px] items-center px-5 py-10 sm:px-6">
        <section className="w-full rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] p-6" aria-labelledby="onboarding-error-title">
          <h1 id="onboarding-error-title" className="text-[length:var(--uo-route-text-page-title-size)] font-medium leading-10">We could not load setup</h1>
          <p className="mt-3 text-sm leading-5 text-[var(--uo-route-text-secondary)]">Your saved setup progress has not changed. Try again to continue.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={reset}>Try again</Button>
            <Link href="/login" className="text-sm font-medium text-[var(--uo-route-action-primary)] underline-offset-4 hover:underline">Sign in again</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
