import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Bone } from './primitives';
import { workbenchSectionStyle } from './workbenchSectionStyle';

const NAV_PILL_COUNT = 7;
const NAV_PILL_KEYS = ['nav-pill-1', 'nav-pill-2', 'nav-pill-3', 'nav-pill-4', 'nav-pill-5', 'nav-pill-6', 'nav-pill-7'] as const;
const KPI_SLOT_KEYS = ['kpi-slot-1', 'kpi-slot-2', 'kpi-slot-3', 'kpi-slot-4', 'kpi-slot-5', 'kpi-slot-6', 'kpi-slot-7', 'kpi-slot-8', 'kpi-slot-9', 'kpi-slot-10'] as const;

export function WorkbenchPageSkeleton({
  showNav = true,
  showActions = true,
  kpiCount = 5,
  kpiColsClassName = 'grid-cols-2 md:grid-cols-5',
  showActionBar = false,
  children,
}: {
  showNav?: boolean;
  showActions?: boolean;
  kpiCount?: number;
  kpiColsClassName?: string;
  showActionBar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="p-3 md:p-5 animate-pulse" aria-busy="true" aria-label="Loading page">
      <section className="overflow-hidden border" style={workbenchSectionStyle}>
        <header
          className="border-b px-4 py-3"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-7 w-48 max-w-full" />
              {showNav && (
                <div className="flex flex-wrap gap-4 pt-1">
                  {NAV_PILL_KEYS.slice(0, NAV_PILL_COUNT).map((pillKey) => (
                    <Bone key={pillKey} className="h-4 w-14" />
                  ))}
                </div>
              )}
              <Bone className="h-4 w-full max-w-xl" />
            </div>
            {showActions && (
              <div className="flex items-center gap-2 shrink-0">
                <Bone className="h-8 w-28" />
              </div>
            )}
          </div>
        </header>

        {kpiCount > 0 && (
        <div
          className={cn('grid border-b', kpiColsClassName)}
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
        >
          {KPI_SLOT_KEYS.slice(0, kpiCount).map((slotKey, idx) => (
            <div
              key={slotKey}
              className="min-w-0 p-3 md:px-4 space-y-2"
              style={{
                borderRightColor: 'var(--surface-border)',
                borderRightWidth: idx === kpiCount - 1 ? 0 : 1,
                borderRightStyle: idx === kpiCount - 1 ? 'none' : 'solid',
              }}
            >
              <Bone className="h-3 w-16" />
              <Bone className="h-6 w-12" />
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
        )}

        {showActionBar && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2"
            style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-overlay)' }}
          >
            <Bone className="h-9 w-full max-w-md" />
            <Bone className="h-8 w-24" />
          </div>
        )}

        {children}
      </section>
    </div>
  );
}
