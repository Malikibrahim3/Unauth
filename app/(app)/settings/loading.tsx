import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 max-w-2xl space-y-[var(--space-6)]" aria-busy="true" aria-label="Loading…">
      {/* Page title */}
      <Skeleton style={{ width: 160, height: 28 }} />

      {/* Form section card */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-3)] border p-[var(--space-5)] space-y-[var(--space-4)]" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
          <Skeleton style={{ width: 140, height: 16 }} />
          <div className="space-y-[var(--space-3)]">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="space-y-[var(--space-2)]">
                <Skeleton style={{ width: 80, height: 12 }} />
                <Skeleton style={{ width: '100%', height: 36 }} className="rounded-[var(--radius-2)]" />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Skeleton style={{ width: 80, height: 32 }} className="rounded-[var(--radius-2)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
