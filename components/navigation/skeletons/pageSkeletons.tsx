import { Bone, MetricCardGridSkeleton, SectionCardSkeleton, TableSkeleton } from './primitives';
import { WorkbenchPageSkeleton } from './WorkbenchPageSkeleton';

export function DashboardLoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-5 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Bone className="h-8 w-36" />
          <Bone className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-32" />
        </div>
      </header>

      <MetricCardGridSkeleton count={5} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-44" />
            </div>
            <Bone className="h-3 w-20" />
          </div>
          <Bone className="h-[130px] w-full rounded-md" />
        </section>
        <section
          className="rounded-lg border p-4 space-y-4"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
        >
          <div className="space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-8 w-20" />
            <Bone className="h-3 w-36" />
          </div>
          <div className="space-y-2">
            <Bone className="h-3 w-40" />
            <Bone className="h-10 w-full" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-2.5"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div className="space-y-1">
              <Bone className="h-4 w-28" />
              <Bone className="h-3 w-56" />
            </div>
            <Bone className="h-3 w-16" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-4 py-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="space-y-2">
                <Bone className="h-4 w-48" />
                <Bone className="h-3 w-40" />
                <Bone className="h-3 w-56" />
              </div>
              <Bone className="h-3 w-12 self-center" />
            </div>
          ))}
        </section>
        <aside className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border p-4 space-y-2"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
            >
              <Bone className="h-4 w-36" />
              <Bone className="h-7 w-10" />
              <Bone className="h-3 w-full" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

export function StoreLoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-5 animate-pulse" aria-busy="true" aria-label="Loading store overview">
      <header
        className="rounded-lg"
        style={{
          background: 'var(--bg-canvas)',
          borderBottom: '1px solid var(--border-default)',
          padding: '16px 24px',
        }}
      >
        <Bone className="h-3 w-12 mb-2" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Bone className="h-8 w-40" />
            <Bone className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Bone className="h-9 w-28" />
            <Bone className="h-9 w-32" />
          </div>
        </div>
      </header>

      <MetricCardGridSkeleton count={5} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section
            className="rounded-lg border p-4"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <Bone className="h-4 w-28 mb-1" />
            <Bone className="h-3 w-40 mb-3" />
            <Bone className="h-[130px] w-full rounded-md" />
          </section>
          <SectionCardSkeleton titleWidth="w-44">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border px-3 py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
                  <Bone className="h-8 w-8 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Bone className="h-3 w-24" />
                    <Bone className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </SectionCardSkeleton>
        </div>
        <aside className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border p-4 space-y-3"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
            >
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-full" />
              <Bone className="h-8 w-full" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

export function WatchlistLoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-5 animate-pulse" aria-busy="true" aria-label="Loading watchlist">
      <header
        style={{
          background: 'var(--bg-canvas)',
          borderBottom: '1px solid var(--border-default)',
          padding: '16px 24px',
        }}
      >
        <Bone className="h-3 w-28 mb-2" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Bone className="h-8 w-32" />
            <Bone className="h-4 w-96 max-w-full" />
          </div>
          <Bone className="h-8 w-36" />
        </div>
      </header>

      <MetricCardGridSkeleton count={3} colsClassName="grid-cols-2 lg:grid-cols-3" />

      <SectionCardSkeleton titleWidth="w-36">
        <TableSkeleton
          columns={[
            { width: '30%' },
            { width: '25%' },
            { width: '15%' },
            { width: '15%' },
            { width: '15%' },
          ]}
          rows={3}
        />
      </SectionCardSkeleton>

      <SectionCardSkeleton titleWidth="w-40" actions>
        <div className="flex justify-end gap-2 mb-4">
          <Bone className="h-8 w-40" />
          <Bone className="h-8 w-24" />
        </div>
        <TableSkeleton
          columns={[
            { width: 44, className: 'w-11' },
            { width: '35%' },
            { width: '20%' },
            { width: '25%' },
            { width: '15%', className: 'text-right' },
          ]}
          rows={6}
        />
      </SectionCardSkeleton>
    </div>
  );
}

export function CustomersLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={5}>
      <div className="p-4 space-y-4">
        <div
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
        >
          <div className="flex justify-between gap-3">
            <Bone className="h-4 w-48" />
            <Bone className="h-3 w-24" />
          </div>
          <Bone className="h-8 w-full max-w-md" />
        </div>
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
        >
          <Bone className="h-3 w-12" />
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-7 w-20 rounded-sm" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Bone className="h-3 w-20" />
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-7 w-28 rounded-sm" />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Bone className="h-3 w-40" />
          <Bone className="h-8 w-48" />
        </div>
        <TableSkeleton
          columns={[
            { width: '28%' },
            { width: '12%' },
            { width: '10%' },
            { width: '10%' },
            { width: '12%' },
            { width: '12%' },
            { width: '10%' },
          ]}
          rows={8}
        />
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function ClaimsLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton kpiCount={6} kpiColsClassName="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Bone className="h-3 w-32" />
          <Bone className="h-8 w-28" />
        </div>
        <div className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {[...Array(8)].map((_, i) => (
            <Bone key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
        <Bone className="h-12 w-full rounded-md" />
        <div className="flex flex-wrap gap-2">
          {[...Array(5)].map((_, i) => (
            <Bone key={i} className="h-7 w-28 rounded-md" />
          ))}
        </div>
        <TableSkeleton
          minWidth="1080px"
          columns={[
            {},
            { width: 160 },
            {},
            {},
            {},
            { className: 'hidden xl:table-cell' },
            { width: 150 },
            { className: 'hidden xl:table-cell' },
            { className: 'hidden lg:table-cell' },
            { className: 'hidden lg:table-cell' },
            {},
            { className: 'hidden xl:table-cell' },
            {},
            { className: 'hidden lg:table-cell' },
            { width: 72 },
          ]}
          rows={7}
        />
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function ReportsLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActions kpiCount={0}>
      <div
        className="flex gap-1 border-b px-4"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}
      >
        {[...Array(3)].map((_, i) => (
          <Bone key={i} className="h-10 w-28 mb-0 rounded-none" style={{ borderRadius: 4 }} />
        ))}
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
              <Bone className="h-3 w-20" />
              <Bone className="h-7 w-14" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCardSkeleton titleWidth="w-36">
            <Bone className="h-40 w-full" />
          </SectionCardSkeleton>
          <SectionCardSkeleton titleWidth="w-32">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <Bone className="h-3 w-24" />
                    <Bone className="h-3 w-8" />
                  </div>
                  <Bone className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </SectionCardSkeleton>
        </div>
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function ChargebacksLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={5}>
      <div>
        <div className="border-b px-4 py-4 space-y-3" style={{ borderColor: 'var(--border-default)' }}>
          <Bone className="h-4 w-36" />
          <Bone className="h-16 w-full max-w-lg" />
          <Bone className="h-3 w-80" />
        </div>
        <TableSkeleton
          columns={[
            { width: '12%' },
            { width: '18%' },
            { width: '14%' },
            { width: '14%' },
            { width: '12%' },
            { width: '12%' },
            { width: '18%' },
          ]}
          rows={6}
        />
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function UploadLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActions kpiCount={0}>
      <div className="mx-auto w-full max-w-3xl p-4 space-y-6">
        <div
          className="rounded-[var(--radius-2)] px-5 py-4 space-y-2"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
        >
          <Bone className="h-5 w-64" />
          <Bone className="h-3 w-full" />
        </div>
        <div
          className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-4"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
        >
          <Bone className="h-12 w-12 rounded-full" />
          <Bone className="h-4 w-48" />
          <Bone className="h-3 w-64" />
          <Bone className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          <Bone className="h-4 w-32" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="space-y-1.5">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
        <Bone className="h-3 w-72 mx-auto" />
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function HistoryLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={5}>
      <div className="p-4">
        <AuditHistoryTableSkeleton />
      </div>
    </WorkbenchPageSkeleton>
  );
}

function AuditHistoryTableSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { width: 44, className: 'w-11' },
        { width: '22%' },
        { width: '12%' },
        { width: '18%' },
        { width: '12%' },
        { width: '10%', className: 'text-right' },
        { width: '10%', className: 'text-right' },
        { width: '14%' },
        { width: 48 },
      ]}
      rows={6}
    />
  );
}
