import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Bone({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('animate-pulse rounded-md', className)}
      style={{ background: 'var(--bg-subtle)', ...style }}
      aria-hidden="true"
    />
  );
}

export const workbenchSectionStyle: React.CSSProperties = {
  borderColor: 'var(--surface-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-raised)',
  boxShadow: 'var(--shadow-1)',
};

export function MetricCardGridSkeleton({
  count = 5,
  colsClassName = 'grid-cols-2 lg:grid-cols-5',
}: {
  count?: number;
  colsClassName?: string;
}) {
  return (
    <div className={cn('grid gap-3', colsClassName)}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="rounded-lg border p-4 space-y-2"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
        >
          <Bone className="h-3 w-20" />
          <Bone className="h-7 w-16" />
          <Bone className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  columns,
  rows = 6,
  minWidth,
}: {
  columns: Array<{ width?: string | number; className?: string }>;
  rows?: number;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead style={{ background: 'var(--bg-subtle)' }}>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {columns.map((col, i) => (
              <th key={i} className={cn('px-4 py-2.5 text-left', col.className)} style={{ width: col.width }}>
                <Bone className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIdx) => (
            <tr key={rowIdx} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={cn('px-4 py-3', col.className)}>
                  <Bone className={cn('h-4', colIdx === 0 ? 'w-36' : 'w-20')} />
                  {colIdx === 0 && <Bone className="mt-1.5 h-3 w-28" />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionCardSkeleton({
  titleWidth = 'w-40',
  children,
  actions,
}: {
  titleWidth?: string;
  children: ReactNode;
  actions?: boolean;
}) {
  return (
    <section
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
    >
      <div
        className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="space-y-1.5 min-w-0">
          <Bone className={cn('h-4', titleWidth)} />
          <Bone className="h-3 w-56 max-w-full" />
        </div>
        {actions ? <Bone className="h-8 w-32 shrink-0" /> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
