import { LoadingSkeleton, Surface } from '@/components/ui';

export default function DemoLoading() {
  return (
    <main className="ua-app ua-auth-surface min-h-screen p-4 sm:p-6" data-state-id="demo-loading" aria-busy="true">
      <div className="mx-auto max-w-7xl"><Surface structure="working" pad="standard"><LoadingSkeleton variant="detail" title="Loading the synthetic case walkthrough" rows={6} /></Surface></div>
    </main>
  );
}
