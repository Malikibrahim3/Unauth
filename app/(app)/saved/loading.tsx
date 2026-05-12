import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 max-w-xl space-y-[var(--space-5)]" aria-busy="true" aria-label="Loading…">
      {/* Header row with icon + title */}
      <div className="flex items-center gap-[var(--space-3)]">
        <Skeleton className="w-5 h-5 rounded-[var(--radius-1)] shrink-0" />
        <Skeleton style={{ width: 140, height: 24 }} />
      </div>

      {/* Content card placeholder */}
      <Skeleton style={{ width: '100%', height: 180 }} className="rounded-[var(--radius-3)]" />
    </div>
  );
}
