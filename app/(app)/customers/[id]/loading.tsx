import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 space-y-[var(--space-6)]" aria-busy="true" aria-label="Loading…">
      {/* Profile header: avatar + name + badges + actions */}
      <div className="flex items-start gap-[var(--space-4)]">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-[var(--space-2)]">
          <Skeleton style={{ width: 220, height: 24 }} />
          <Skeleton style={{ width: 160, height: 14 }} />
          <div className="flex items-center gap-[var(--space-2)] mt-1">
            <Skeleton style={{ width: 60, height: 22 }} className="rounded-[var(--radius-pill)]" />
            <Skeleton style={{ width: 72, height: 22 }} className="rounded-[var(--radius-pill)]" />
          </div>
        </div>
        <div className="flex gap-[var(--space-2)] shrink-0">
          <Skeleton style={{ width: 32, height: 32 }} className="rounded-[var(--radius-2)]" />
          <Skeleton style={{ width: 100, height: 32 }} className="rounded-[var(--radius-2)]" />
        </div>
      </div>

      {/* MetricCard row — 4 cards */}
      <div className="grid grid-cols-2 gap-[var(--space-3)] lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-3)] border p-[var(--space-4)] space-y-[var(--space-2)]" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
            <Skeleton style={{ width: '55%', height: 11 }} />
            <Skeleton style={{ width: '65%', height: 28 }} className="rounded-[var(--radius-2)]" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-[var(--space-3)] border-b" style={{ borderColor: 'var(--border-default)' }}>
        {[80, 100, 90, 80].map((w, i) => (
          <Skeleton key={i} style={{ width: w, height: 14 }} className="mb-3" />
        ))}
      </div>

      {/* Section cards */}
      <div className="space-y-[var(--space-4)]">
        <Skeleton style={{ width: '100%', height: 120 }} className="rounded-[var(--radius-3)]" />
        <Skeleton style={{ width: '100%', height: 200 }} className="rounded-[var(--radius-3)]" />
        <Skeleton style={{ width: '100%', height: 160 }} className="rounded-[var(--radius-3)]" />
      </div>
    </div>
  );
}
