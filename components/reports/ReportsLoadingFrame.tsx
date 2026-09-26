import { Bone, TableSkeleton } from '@/components/navigation/skeletons/primitives';
import { LoadingSkeleton, PageFrame } from '@/components/ui';
import { ReportsTabs } from '@/components/reports/ReportsChrome';

export function ReportsLoadingFrame({ view = 'index' }: { view?: 'index' | 'report' | 'records' }) {
  const query = { range: '30d' as const, timezone: 'UTC', currency: null, compare: 'none' as const, report: view === 'report' ? 'financial' : null };
  return (
    <div data-state-id="reports-and-records-loading">
    <PageFrame
      title={view === 'index' ? 'Reports' : view === 'report' ? 'Financial performance' : 'Supporting records'}
      subtitle={view === 'index' ? 'One scope, applied to every report.' : view === 'report' ? 'A single operating question, answered at the selected scope.' : 'The immutable records behind the selected report metric.'}
      breadcrumbs={[{ label: 'Financials', href: '/financials/losses' }, { label: 'Reports' }]}
      showCurrentBreadcrumb
      tabs={<ReportsTabs view={view} query={query} />}
      headerCapabilityId="operations-reports"
      surfaceId="reports-and-records-loading"
      archetype="P9"
      toolbar={<section className="flex items-center gap-3" aria-label="Loading report scope"><div className="flex flex-wrap gap-3"><Bone className="h-8 w-64" /><Bone className="h-8 w-64" /><Bone className="h-8 w-72" /><Bone className="h-8 w-44" /></div></section>}
    >
      <div aria-busy="true" aria-label="Loading report data" className="space-y-4">
        {view === 'records' ? <section className="p-4"><Bone className="mb-4 h-8 w-72" /><TableSkeleton columns={[{ width: '16%' }, { width: '16%' }, { width: '16%' }, { width: '18%' }, { width: '16%' }, { width: '18%' }]} rows={8} /></section> : view === 'index' ? <section className="rounded-xl border border-[#e4e3e0] bg-white p-4"><LoadingSkeleton variant="header" announce={false} delayMs={0} className="py-0" /><TableSkeleton columns={[{ width: '20%' }, { width: '52%' }, { width: '20%' }, { width: '8%' }]} rows={9} /></section> : <section className="rounded-xl border border-[#e4e3e0] bg-white"><div className="flex items-center gap-3"><LoadingSkeleton variant="header" announce={false} delayMs={0} className="px-4 py-0" /></div><div className="p-4"><TableSkeleton columns={[{ width: '22%' }, { width: '36%' }, { width: '16%' }, { width: '14%' }, { width: '12%' }]} rows={6} /></div></section>}
      </div>
    </PageFrame>
    </div>
  );
}
