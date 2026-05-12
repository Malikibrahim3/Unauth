import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 space-y-[var(--space-5)]" aria-busy="true" aria-label="Loading…">
      {/* PageHeader */}
      <div className="flex items-start justify-between">
        <div className="space-y-[var(--space-2)]">
          <Skeleton style={{ width: 120, height: 28 }} />
          <Skeleton style={{ width: 220, height: 16 }} />
        </div>
        <Skeleton style={{ width: 80, height: 32 }} className="rounded-[var(--radius-2)]" />
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <Skeleton style={{ width: 100, height: 28 }} className="rounded-[var(--radius-2)]" />
        <Skeleton style={{ width: 120, height: 14 }} />
      </div>

      {/* Table rows */}
      <div className="rounded-[var(--radius-3)] border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] border-b last:border-b-0" style={{ borderColor: 'var(--border-default)' }}>
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-[var(--space-2)]">
              <Skeleton style={{ width: `${45 + (i % 4) * 12}%`, height: 14 }} />
              <Skeleton style={{ width: `${30 + (i % 3) * 10}%`, height: 12 }} />
            </div>
            <Skeleton style={{ width: 48, height: 24 }} className="rounded-[var(--radius-pill)]" />
            <Skeleton style={{ width: 64, height: 28 }} className="rounded-[var(--radius-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
