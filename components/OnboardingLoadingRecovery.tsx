'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const RECOVERY_DELAY_MS = 10_000;

export function OnboardingLoadingRecovery() {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDelayed(true), RECOVERY_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!delayed) return <p className="mt-5 text-xs text-[var(--uo-route-text-secondary)]" role="status">Loading the saved workspace profile and source checklist…</p>;

  return (
    <section className="mt-5 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-warning-border)] bg-[var(--uo-route-warning-bg)] p-4" role="alert">
      <h2 className="text-sm font-semibold">Workspace setup is taking longer than expected</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--uo-route-text-secondary)]">Your saved profile and provider state have not been changed. Retry this route, return safely to sign in, or open the workspace if your setup was already completed.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="ua-button ua-button--primary ua-button--sm" onClick={() => window.location.reload()}>Retry setup</button>
        <Link className="ua-button ua-button--secondary ua-button--sm" href="/login">Sign in again</Link>
        <Link className="ua-button ua-button--secondary ua-button--sm" href="/overview">Open workspace</Link>
      </div>
    </section>
  );
}
