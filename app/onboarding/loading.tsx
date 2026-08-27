import { Bone } from '@/components/ui/LoadingSkeleton';
import { OnboardingLoadingRecovery } from '@/components/OnboardingLoadingRecovery';

export default function OnboardingLoading() {
  return (
    <main className="ua-auth-surface min-h-screen bg-[var(--uo-route-canvas)] text-[var(--uo-route-text-primary)]" data-surface-id="workspace-onboarding" data-state-id="onboarding-loading">
      <header className="h-12 border-b border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-shell)]" />
      <div className="mx-auto max-w-[820px] px-4 pb-10 pt-8 sm:px-6" aria-busy="true" aria-label="Loading workspace setup">
        <span className="sr-only" role="status">Loading workspace setup</span>
        <div className="space-y-2">
          <Bone className="h-3 w-32" />
          <Bone className="h-7 w-40" />
          <Bone className="h-4 w-full" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[184px_minmax(0,1fr)]">
          <div className="space-y-2 pt-1">
            <Bone className="h-4 w-20" />
            <Bone className="h-24 w-full" />
          </div>
          <section className="min-h-[474px] rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] p-5 sm:p-6">
            <Bone className="h-8 w-8" />
            <Bone className="mt-4 h-5 w-40" />
            <Bone className="mt-3 h-4 w-full" />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Bone className="h-3 w-28" />
                  <Bone className="h-9 w-full" />
                </div>
              ))}
            </div>
            <OnboardingLoadingRecovery />
          </section>
        </div>
      </div>
    </main>
  );
}
