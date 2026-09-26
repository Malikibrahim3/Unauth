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

  if (!delayed) return <p className="mt-5 text-xs text-[#64686d]" role="status">Loading the saved workspace profile and source checklist…</p>;

  return (
    <section className="mt-5 rounded-[8px] border border-[#ead8b6] bg-[#fff3e9] p-4" role="alert">
      <h2 className="text-sm font-semibold">Workspace setup is taking longer than expected</h2>
      <p className="mt-1 text-xs leading-5 text-[#64686d]">Your saved profile and provider state have not been changed. Retry this route, return safely to sign in, or open the workspace if your setup was already completed.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-[#1c1f23] text-white border-[#1c1f23] h-8 px-3 text-[12px]" onClick={() => window.location.reload()}>Retry setup</button>
        <Link className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-white text-[#40454a] border-[#d8d4cf] h-8 px-3 text-[12px]" href="/login">Sign in again</Link>
        <Link className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-white text-[#40454a] border-[#d8d4cf] h-8 px-3 text-[12px]" href="/overview">Open workspace</Link>
      </div>
    </section>
  );
}
