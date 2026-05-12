import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 space-y-[var(--space-5)]" aria-busy="true" aria-label="Loading…">
      {/* Back link + PageHeader */}
      <Skeleton style={{ width: 100, height: 14 }} />
      <div className="flex items-start justify-between">
        <div className="space-y-[var(--space-2)]">
          <Skeleton style={{ width: 180, height: 28 }} />
          <Skeleton style={{ width: 140, height: 16 }} />
        </div>
        <div className="flex gap-[var(--space-2)]">
          <Skeleton style={{ width: 64, height: 22 }} className="rounded-[var(--radius-pill)]" />
          <Skeleton style={{ width: 80, height: 32 }} className="rounded-[var(--radius-2)]" />
        </div>
      </div>

      {/* Signal badges row */}
      <div className="flex flex-wrap gap-[var(--space-2)]">
        {[72, 88, 80, 96, 72].map((w, i) => (
          <Skeleton key={i} style={{ width: w, height: 26 }} className="rounded-[var(--radius-pill)]" />
        ))}
      </div>

      {/* Two-column detail layout */}
      <div className="grid grid-cols-1 gap-[var(--space-4)] lg:grid-cols-2">
        <Skeleton style={{ width: '100%', height: 180 }} className="rounded-[var(--radius-3)]" />
        <Skeleton style={{ width: '100%', height: 180 }} className="rounded-[var(--radius-3)]" />
      </div>

      {/* Identity timeline section */}
      <Skeleton style={{ width: '100%', height: 200 }} className="rounded-[var(--radius-3)]" />
    </div>
  );
}
