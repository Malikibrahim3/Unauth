import { LoadingSkeleton } from '@/components/ui';

export default function DashboardLoading() {
  return <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6"><LoadingSkeleton variant="page" title="Loading dashboard" rows={5} /><LoadingSkeleton variant="chart" title="Loading dashboard chart" /></div>;
}
