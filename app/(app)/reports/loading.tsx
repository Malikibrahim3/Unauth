import { LoadingSkeleton } from '@/components/ui';

export default function ReportsLoading() {
  return <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6"><LoadingSkeleton variant="page" title="Loading reports" rows={4} /><LoadingSkeleton variant="chart" title="Loading report chart" /></div>;
}
