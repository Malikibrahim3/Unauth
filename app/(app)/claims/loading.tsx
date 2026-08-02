import { Bone, LoadingSkeleton } from '@/components/ui';

export default function ClaimsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-3 px-4 pb-7 pt-4 md:px-5">
      <div className="space-y-2" aria-hidden="true">
        <Bone className="h-7 w-24" />
        <Bone className="h-4 w-full max-w-lg" />
      </div>
      <LoadingSkeleton variant="metric-group" title="Loading case queue summary" />
      <section
        className="overflow-hidden rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)]"
        aria-busy="true"
        aria-label="Loading cases registry and selected preview"
      >
        <div className="flex flex-wrap gap-2 border-b border-[var(--ua-border-default)] p-4" aria-hidden="true">
          <Bone className="h-9 min-w-[18rem] flex-1" />
          <Bone className="h-8 w-20" />
          <Bone className="h-8 w-24" />
          <Bone className="h-8 w-28" />
        </div>
        <div className="flex min-h-[560px] flex-col lg:flex-row">
          <div className="w-full space-y-3 border-b border-[var(--ua-border-subtle)] p-4 lg:w-[360px] lg:border-b-0 lg:border-r">
            <LoadingSkeleton variant="table" rows={7} title="Loading cases" announce={false} delayMs={0} />
          </div>
          <div className="min-w-0 flex-1 bg-[var(--ua-surface-secondary)] p-5">
            <LoadingSkeleton variant="drawer" title="Loading selected case preview" announce={false} delayMs={0} />
          </div>
        </div>
      </section>
      <span className="sr-only" role="status">Loading cases</span>
    </div>
  );
}
