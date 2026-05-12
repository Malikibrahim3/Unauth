import { Skeleton } from '@/components/ui/LoadingState';

export default function Loading() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-[var(--space-5)]" aria-busy="true" aria-label="Loading…">
      {/* Back link + PageHeader */}
      <Skeleton style={{ width: 120, height: 14 }} />
      <div className="flex items-start justify-between">
        <div className="space-y-[var(--space-2)]">
          <Skeleton style={{ width: 200, height: 28 }} />
          <Skeleton style={{ width: 280, height: 16 }} />
        </div>
        <Skeleton style={{ width: 100, height: 32 }} className="rounded-[var(--radius-2)]" />
      </div>

      {/* Evidence strength meter */}
      <Skeleton style={{ width: '100%', height: 72 }} className="rounded-[var(--radius-3)]" />

      {/* Two-column layout: main + sidebar */}
      <div className="grid grid-cols-1 gap-[var(--space-4)] lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-[var(--space-4)]">
          <Skeleton style={{ width: '100%', height: 200 }} className="rounded-[var(--radius-3)]" />
          <Skeleton style={{ width: '100%', height: 260 }} className="rounded-[var(--radius-3)]" />
        </div>
        <div className="space-y-[var(--space-4)]">
          <Skeleton style={{ width: '100%', height: 160 }} className="rounded-[var(--radius-3)]" />
          <Skeleton style={{ width: '100%', height: 120 }} className="rounded-[var(--radius-3)]" />
        </div>
      </div>
    </div>
  );
}
