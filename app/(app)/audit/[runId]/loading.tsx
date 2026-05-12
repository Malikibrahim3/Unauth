import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 space-y-[var(--space-5)]" aria-busy="true" aria-label="Loading…">
      {/* PageHeader */}
      <div className="flex items-start justify-between">
        <div className="space-y-[var(--space-2)]">
          <Skeleton style={{ width: 80, height: 12 }} />
          <Skeleton style={{ width: 220, height: 28 }} />
          <Skeleton style={{ width: 180, height: 14 }} />
        </div>
        <div className="flex gap-[var(--space-2)]">
          <Skeleton style={{ width: 100, height: 32 }} className="rounded-[var(--radius-2)]" />
          <Skeleton style={{ width: 80, height: 32 }} className="rounded-[var(--radius-2)]" />
        </div>
      </div>

      {/* Summary stats: 3 metric cards */}
      <div className="grid grid-cols-3 gap-[var(--space-3)]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-3)] border p-[var(--space-4)] space-y-[var(--space-2)]" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
            <Skeleton style={{ width: '55%', height: 11 }} />
            <Skeleton style={{ width: '65%', height: 28 }} className="rounded-[var(--radius-2)]" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <Skeleton style={{ width: '100%', height: 180 }} className="rounded-[var(--radius-3)]" />

      {/* Tabs */}
      <div className="flex gap-[var(--space-3)] border-b" style={{ borderColor: 'var(--border-default)' }}>
        {[90, 110, 100].map((w, i) => (
          <Skeleton key={i} style={{ width: w, height: 14 }} className="mb-3" />
        ))}
      </div>

      {/* Table rows */}
      <div className="rounded-[var(--radius-3)] border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] border-b last:border-b-0" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex-1 space-y-[var(--space-2)]">
              <Skeleton style={{ width: `${40 + (i % 4) * 12}%`, height: 14 }} />
              <Skeleton style={{ width: `${30 + (i % 3) * 8}%`, height: 12 }} />
            </div>
            <Skeleton style={{ width: 52, height: 22 }} className="rounded-[var(--radius-pill)]" />
            <Skeleton style={{ width: 40, height: 22 }} className="rounded-[var(--radius-1)]" />
            <Skeleton style={{ width: 24, height: 24 }} className="rounded-[var(--radius-1)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
