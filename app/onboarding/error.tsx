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
    <main className="ua-auth-surface min-h-screen bg-[var(--ua-canvas)] text-[var(--ua-text-primary)]">
      <header className="flex h-12 items-center justify-between border-b border-[var(--ua-border-subtle)] bg-[var(--ua-shell)] px-4 sm:px-5">
        <UnauthLogo kind="lockup" tone="auto" height={20} alt="Unauth" />
        <span className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">Workspace setup</span>
      </header>
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[440px] items-center px-5 py-10 sm:px-6">
        <section className="w-full rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-6" aria-labelledby="onboarding-error-title">
          <h1 id="onboarding-error-title" className="text-[length:var(--ua-text-page-title-size)] font-semibold leading-6">We could not load setup</h1>
          <p className="mt-3 text-sm leading-5 text-[var(--ua-text-secondary)]">Your saved setup progress has not changed. Try again to continue.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={reset}>Try again</Button>
            <Link href="/login" className="text-sm font-medium text-[var(--ua-action-primary)] underline-offset-4 hover:underline">Sign in again</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
