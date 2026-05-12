import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 space-y-[var(--space-6)]" aria-busy="true" aria-label="Loading…">
      {/* PageHeader */}
      <div className="space-y-[var(--space-2)]">
        <Skeleton style={{ width: 180, height: 28 }} />
        <Skeleton style={{ width: 280, height: 16 }} />
      </div>

      {/* MetricCard grid — 4 cards */}
      <div className="grid grid-cols-2 gap-[var(--space-4)] lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-3)] border p-[var(--space-4)] space-y-[var(--space-3)]" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
            <Skeleton style={{ width: '55%', height: 12 }} />
            <Skeleton style={{ width: '70%', height: 32 }} className="rounded-[var(--radius-2)]" />
            <Skeleton style={{ width: '40%', height: 12 }} />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <Skeleton style={{ width: '100%', height: 220 }} className="rounded-[var(--radius-3)]" />

      {/* Insights strip — 3 horizontal items */}
      <div className="flex gap-[var(--space-3)]">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} style={{ flex: 1, height: 72 }} className="rounded-[var(--radius-3)]" />
        ))}
      </div>
    </div>
  );
}
