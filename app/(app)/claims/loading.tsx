import { LoadingSkeleton } from '@/components/ui';

export default function ClaimsLoading() {
  return <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6"><LoadingSkeleton variant="metric-group" title="Loading payout controls" /><LoadingSkeleton variant="table" title="Loading payout cases" rows={8} /></div>;
}
