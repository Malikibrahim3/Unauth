import { LoadingSkeleton, PageFrame, Surface } from '@/components/ui';

export default function Loading() {
  return (
    <PageFrame title="Notifications" subtitle="Loading your account inbox…">
      <Surface structure="working" className="overflow-hidden">
        <div className="p-5"><LoadingSkeleton variant="chart" title="Loading notification activity" rows={0} /></div>
        <div className="border-t border-[var(--ua-border-subtle)] p-5"><LoadingSkeleton variant="table" title="Loading notifications" rows={8} /></div>
      </Surface>
    </PageFrame>
  );
}
