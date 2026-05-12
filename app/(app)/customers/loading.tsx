import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 space-y-[var(--space-5)]" aria-busy="true" aria-label="Loading…">
      {/* PageHeader */}
      <div className="flex items-start justify-between">
        <div className="space-y-[var(--space-2)]">
          <Skeleton style={{ width: 140, height: 28 }} />
          <Skeleton style={{ width: 200, height: 16 }} />
        </div>
        <div className="flex gap-[var(--space-2)]">
          <Skeleton style={{ width: 80, height: 32 }} className="rounded-[var(--radius-2)]" />
          <Skeleton style={{ width: 80, height: 32 }} className="rounded-[var(--radius-2)]" />
        </div>
      </div>

      {/* Filter bar + search */}
      <div className="flex items-center gap-[var(--space-3)] flex-wrap">
        <Skeleton style={{ width: 220, height: 36 }} className="rounded-[var(--radius-2)]" />
        <Skeleton style={{ width: 100, height: 36 }} className="rounded-[var(--radius-2)]" />
        <Skeleton style={{ width: 80, height: 28 }} className="rounded-[var(--radius-pill)]" />
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius-3)] border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
        {/* Header */}
        <div className="flex items-center gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-2)] border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-subtle)' }}>
          {[120, 80, 60, 60, 60, 60].map((w, i) => (
            <Skeleton key={i} style={{ width: w, height: 12 }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] border-b last:border-b-0" style={{ borderColor: 'var(--border-default)' }}>
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-[var(--space-2)]">
              <Skeleton style={{ width: `${45 + (i % 4) * 12}%`, height: 14 }} />
              <Skeleton style={{ width: `${30 + (i % 3) * 8}%`, height: 11 }} />
            </div>
            <Skeleton style={{ width: 52, height: 22 }} className="rounded-[var(--radius-pill)]" />
            <Skeleton style={{ width: 36, height: 22 }} className="rounded-[var(--radius-1)]" />
            <Skeleton style={{ width: 36, height: 14 }} />
            <Skeleton style={{ width: 36, height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
