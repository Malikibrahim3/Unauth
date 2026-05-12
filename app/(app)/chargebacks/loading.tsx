import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-[var(--space-5)]" aria-busy="true" aria-label="Loading…">
      {/* PageHeader */}
      <div className="space-y-[var(--space-2)]">
        <Skeleton style={{ width: 200, height: 28 }} />
        <Skeleton style={{ width: 340, height: 16 }} />
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius-3)] border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] border-b last:border-b-0" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex-1 space-y-[var(--space-2)]">
              <Skeleton style={{ width: `${50 + (i % 3) * 15}%`, height: 14 }} />
              <Skeleton style={{ width: 140, height: 12 }} />
            </div>
            <Skeleton style={{ width: 90, height: 12 }} />
            <Skeleton style={{ width: 56, height: 22 }} className="rounded-[var(--radius-pill)]" />
            <Skeleton style={{ width: 56, height: 22 }} className="rounded-[var(--radius-pill)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
