import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export function OperationalRouteSkeleton({
  title = "Loading workspace",
  rows = 6,
  detail = false,
}: {
  title?: string;
  rows?: number;
  detail?: boolean;
}) {
  return <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6"><LoadingSkeleton variant={detail ? 'detail' : 'page'} rows={rows} title={title} /></div>;
}
