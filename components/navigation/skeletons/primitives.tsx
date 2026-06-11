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
      className={cn('skeleton rounded-md', className)}
      style={{ background: 'var(--bg-subtle)', ...style }}
      aria-hidden="true"
    />
  );
}

const METRIC_CARD_KEYS = ['metric-1', 'metric-2', 'metric-3', 'metric-4', 'metric-5', 'metric-6', 'metric-7', 'metric-8', 'metric-9', 'metric-10'] as const;
const TABLE_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5', 'row-6', 'row-7', 'row-8', 'row-9', 'row-10', 'row-11', 'row-12'] as const;

function skeletonColumnKey(index: number, col: { width?: string | number; className?: string }) {
  if (col.className) return `${index}-${col.className}`;
  if (col.width != null) return `${index}-${String(col.width)}`;
  return `col-${index}`;
}

export function MetricCardGridSkeleton({
  count = 5,
  colsClassName = 'grid-cols-2 lg:grid-cols-5',
}: {
  count?: number;
  colsClassName?: string;
}) {
  return (
    <div className={cn('grid gap-3', colsClassName)}>
      {METRIC_CARD_KEYS.slice(0, count).map((cardKey) => (
        <div
          key={cardKey}
          className="rounded-md border p-4 space-y-2"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
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
    <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--border-muted)' }}>
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead style={{ background: 'var(--bg-subtle)' }}>
          <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
            {columns.map((col, i) => (
              <th key={skeletonColumnKey(i, col)} className={cn('px-4 py-2.5 text-left', col.className)} style={{ width: col.width }}>
                <Bone className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_ROW_KEYS.slice(0, rows).map((rowKey) => (
            <tr key={rowKey} className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
              {columns.map((col, colIdx) => (
                <td key={`${rowKey}-${skeletonColumnKey(colIdx, col)}`} className={cn('px-4 py-3', col.className)}>
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
      className="rounded-md border overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div
        className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: 'var(--border)' }}
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
