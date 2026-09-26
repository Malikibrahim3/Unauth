import type { ReactNode } from 'react';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

export function RecoveryShell({
  title,
  description,
  actions,
  reference,
  stateId,
  surfaceId,
}: {
  title: string;
  description: string;
  actions: ReactNode;
  reference?: ReactNode;
  stateId?: string;
  surfaceId?: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#f4f3f1] p-6 text-[#1c1f23]" data-surface-id={surfaceId} data-state-id={stateId}>
      <UnauthLogo kind="lockup" tone="auto" height={22} alt="" decorative />
      <section className="w-full max-w-lg rounded-xl border border-[#e4e3e0] bg-white p-6 text-center shadow-[0_1px_2px_rgba(28,27,25,.05)] [&_h1]:m-0 [&_h1]:text-[20px] [&_p]:text-[12px] [&_p]:leading-[1.55] [&_p]:text-[#64686d]" aria-labelledby="recovery-title">
        <h1 id="recovery-title">{title}</h1>
        <p>{description}</p>
        <div className="mt-5 flex items-center justify-center gap-3">{actions}</div>
        {reference ? <p className="mt-4 font-mono text-[10px]">Reference: {reference}</p> : null}
      </section>
    </main>
  );
}
