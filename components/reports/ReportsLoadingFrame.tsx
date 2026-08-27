import { Bone, TableSkeleton } from '@/components/navigation/skeletons/primitives';
import { LoadingSkeleton, PageFrame } from '@/components/ui';
import { ReportsTabs } from '@/components/reports/ReportsChrome';

export function ReportsLoadingFrame({ view = 'index' }: { view?: 'index' | 'report' | 'records' }) {
  const query = { range: '30d' as const, timezone: 'UTC', currency: null, compare: 'none' as const, report: view === 'report' ? 'financial' : null };
  return (
    <PageFrame
      title={view === 'index' ? 'Reports' : view === 'report' ? 'Financial performance' : 'Supporting records'}
      subtitle={view === 'index' ? 'One scope, applied to every report.' : view === 'report' ? 'A single operating question, answered at the selected scope.' : 'The immutable records behind the selected report metric.'}
      breadcrumbs={[{ label: 'Financials', href: '/financials/losses' }, { label: 'Reports' }]}
      showCurrentBreadcrumb
      tabs={<ReportsTabs view={view} query={query} />}
      headerCapabilityId="operations-reports"
      surfaceId="reports-and-records-loading"
      archetype="P9"
      toolbar={<section className="ua-reports-scope" aria-label="Loading report scope"><div className="flex flex-wrap gap-3"><Bone className="h-8 w-64" /><Bone className="h-8 w-64" /><Bone className="h-8 w-72" /><Bone className="h-8 w-44" /></div></section>}
    >
      <div aria-busy="true" aria-label="Loading report data" className="ua-reports-content">
        {view === 'records' ? <section className="ua-stage-ladder p-4"><Bone className="mb-4 h-8 w-72" /><TableSkeleton columns={[{ width: '16%' }, { width: '16%' }, { width: '16%' }, { width: '18%' }, { width: '16%' }, { width: '18%' }]} rows={8} /></section> : view === 'index' ? <section className="ua-report-card ua-report-command p-4"><LoadingSkeleton variant="header" announce={false} delayMs={0} className="py-0" /><TableSkeleton columns={[{ width: '20%' }, { width: '52%' }, { width: '20%' }, { width: '8%' }]} rows={9} /></section> : <section className="ua-stage-ladder"><div className="ua-stage-ladder__header"><LoadingSkeleton variant="header" announce={false} delayMs={0} className="py-0" /></div><div className="p-4"><TableSkeleton columns={[{ width: '22%' }, { width: '36%' }, { width: '16%' }, { width: '14%' }, { width: '12%' }]} rows={6} /></div></section>}
      </div>
    </PageFrame>
  );
}
