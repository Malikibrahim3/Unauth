import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8" aria-busy="true" aria-label="Loading…">
      <div className="w-full max-w-lg space-y-[var(--space-5)]">
        <div className="space-y-[var(--space-2)]">
          <Skeleton style={{ width: 200, height: 28 }} />
          <Skeleton style={{ width: 300, height: 16 }} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-[var(--space-2)]">
            <Skeleton style={{ width: 100, height: 12 }} />
            <Skeleton style={{ width: '100%', height: 40 }} className="rounded-[var(--radius-2)]" />
          </div>
        ))}
        <Skeleton style={{ width: '100%', height: 40 }} className="rounded-[var(--radius-2)]" />
      </div>
    </div>
  );
}
