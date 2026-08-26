import { LoadingSkeleton, PageFrame, Surface } from '@/components/ui';

export default function Loading() {
  return (
    <PageFrame title="Notifications" subtitle="Loading your account inbox…" surfaceId="notifications-inbox">
      <Surface structure="working" className="overflow-hidden">
        <div data-state-id="notifications-loading" className="p-5"><LoadingSkeleton variant="chart" title="Loading notification activity" rows={0} /></div>
        <div className="border-t border-[var(--uo-route-border-subtle)] p-5"><LoadingSkeleton variant="table" title="Loading notifications" rows={8} /></div>
      </Surface>
    </PageFrame>
  );
}
