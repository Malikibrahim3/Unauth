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
    <main className="grid min-h-full grid-cols-[240px_minmax(0,1fr)] bg-[#ffffff] text-[#1c1f23]" data-surface-id={surfaceId}>
      <aside className="border-r border-[#e4e3e0] bg-[#f4f3f1] p-5" aria-label="Setup progress">{progress}</aside>
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-8" aria-labelledby="onboarding-title">
        <header className="border-b border-[#e4e3e0] pb-4">
          <h1 id="onboarding-title" className="m-0 text-[20px] font-semibold">{title}</h1>
          {description ? <p className="mt-2 text-[12px] leading-5 text-[#64686d]">{description}</p> : null}
        </header>
        <div className="flex flex-col gap-3">{children}</div>
        {actions ? <footer className="flex items-center justify-end gap-3 border-t border-[#e4e3e0] pt-4">{actions}</footer> : null}
      </section>
    </main>
  );
}
