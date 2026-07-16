import { Bone, SectionCardSkeleton, TableSkeleton } from './primitives';
import { WorkbenchPageSkeleton } from './WorkbenchPageSkeleton';

export function CustomersLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={5}>
      <div className="space-y-4 p-4">
        <div
          className="space-y-3 rounded-md border p-4"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="flex justify-between gap-3">
            <Bone className="h-4 w-48" />
            <Bone className="h-3 w-24" />
          </div>
          <Bone className="h-8 w-full max-w-md" />
        </div>
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <Bone className="h-3 w-12" />
          {[...Array(4)].map((_, index) => (
            <Bone key={index} className="h-7 w-20 rounded-sm" />
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

export function TablePageLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={4}>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <Bone className="h-3 w-40" />
          <Bone className="h-8 w-28" />
        </div>
        <TableSkeleton
          columns={[
            { width: '28%' },
            { width: '16%' },
            { width: '14%' },
            { width: '14%' },
            { width: '14%' },
            { width: '14%' },
          ]}
          rows={8}
        />
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function FormPageLoadingSkeleton() {
  return (
    <div className="max-w-2xl space-y-6 p-6 md:p-8" aria-busy="true">
      <div className="space-y-2">
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-80 max-w-full" />
      </div>
      <SectionCardSkeleton titleWidth="w-40">
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Bone className="h-3 w-24" />
              <Bone className="h-10 w-full" />
            </div>
          ))}
          <Bone className="h-10 w-36" />
        </div>
      </SectionCardSkeleton>
    </div>
  );
}

export function SettingsListLoadingSkeleton() {
  return (
    <div className="max-w-3xl space-y-6 p-6 md:p-8" aria-busy="true">
      <div className="space-y-2">
        <Bone className="h-8 w-44" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center justify-between gap-4 rounded-md border px-4 py-3 sm:flex-nowrap"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Bone className="h-9 w-9 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Bone className="h-4 w-36 max-w-full" />
                <Bone className="h-3 w-52 max-w-full" />
              </div>
            </div>
            <Bone className="h-8 w-24 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
