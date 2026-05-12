import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 max-w-3xl space-y-[var(--space-5)]" aria-busy="true" aria-label="Loading…">
      {/* PageHeader */}
      <div className="space-y-[var(--space-2)]">
        <Skeleton style={{ width: 140, height: 28 }} />
        <Skeleton style={{ width: 320, height: 16 }} />
      </div>

      {/* Dropzone card */}
      <Skeleton style={{ width: '100%', height: 180 }} className="rounded-[var(--radius-3)]" />

      {/* Footer row: button */}
      <div className="flex items-center justify-between">
        <Skeleton style={{ width: 180, height: 14 }} />
        <Skeleton style={{ width: 120, height: 36 }} className="rounded-[var(--radius-2)]" />
      </div>
    </div>
  );
}
