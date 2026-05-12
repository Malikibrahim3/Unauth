import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 space-y-[var(--space-6)]" aria-busy="true" aria-label="Loading…">
      {/* PageHeader */}
      <div className="space-y-[var(--space-2)]">
        <Skeleton style={{ width: 80, height: 28 }} />
        <Skeleton style={{ width: 240, height: 16 }} />
      </div>

      {/* Article cards grid */}
      <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-3)] border p-[var(--space-5)] space-y-[var(--space-3)]" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
            <Skeleton className="w-6 h-6 rounded-[var(--radius-1)]" />
            <Skeleton style={{ width: '70%', height: 18 }} />
            <Skeleton style={{ width: '90%', height: 13 }} />
            <Skeleton style={{ width: '75%', height: 13 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
