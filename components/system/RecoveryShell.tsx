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
    <main className="ua-recovery-shell" data-surface-id={surfaceId} data-state-id={stateId}>
      <UnauthLogo kind="lockup" tone="auto" height={22} alt="" decorative />
      <section className="ua-recovery-shell__content" aria-labelledby="recovery-title">
        <h1 id="recovery-title">{title}</h1>
        <p>{description}</p>
        <div className="ua-recovery-shell__actions">{actions}</div>
        {reference ? <p className="ua-recovery-shell__reference">Reference: {reference}</p> : null}
      </section>
    </main>
  );
}
