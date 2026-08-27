import type { ReactNode } from 'react';

export function OnboardingShell({
  progress,
  title,
  description,
  children,
  actions,
  surfaceId = 'workspace-onboarding-store-profile',
}: {
  progress: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  surfaceId?: string;
}) {
  return (
    <main className="ua-onboarding-shell" data-surface-id={surfaceId}>
      <aside className="ua-onboarding-shell__progress" aria-label="Setup progress">{progress}</aside>
      <section className="ua-onboarding-shell__task" aria-labelledby="onboarding-title">
        <header>
          <h1 id="onboarding-title">{title}</h1>
          {description ? <p>{description}</p> : null}
        </header>
        <div className="ua-onboarding-shell__body">{children}</div>
        {actions ? <footer className="ua-onboarding-shell__actions">{actions}</footer> : null}
      </section>
    </main>
  );
}
