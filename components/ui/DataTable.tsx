'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render: (row: T) => ReactNode;
  width?: string;
}

type TableDensity = 'default' | 'compact' | 'relaxed';

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  loading?: boolean;
  density?: TableDensity;
  selectedKey?: string;
  className?: string;
  emptyState?: ReactNode;
}

const ROW_HEIGHT: Record<TableDensity, string> = {
  compact:  'h-10',
  default:  'h-12',
  relaxed:  'h-14',
};

function SkeletonRows({ count = 6, cols }: { count?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--border-subtle)]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-[var(--space-4)] py-[var(--space-3)]">
              <div
                className="h-4 rounded-[var(--radius-1)] skeleton"
                style={{ width: j === 0 ? '60%' : j === 1 ? '80%' : '50%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir?: 'asc' | 'desc' }) {
  return (
    <svg
      className={cn('ml-1 w-3 h-3 inline-block shrink-0', active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]')}
      viewBox="0 0 10 12"
      fill="currentColor"
      aria-hidden="true"
    >
      {(!active || dir === 'asc') && (
        <path d="M5 2L8 6H2L5 2Z" opacity={active && dir === 'asc' ? 1 : 0.4} />
      )}
      {(!active || dir === 'desc') && (
        <path d="M5 10L2 6H8L5 10Z" opacity={active && dir === 'desc' ? 1 : 0.4} />
      )}
    </svg>
  );
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
  loading = false,
  density = 'default',
  selectedKey,
  className,
  emptyState,
}: DataTableProps<T>) {
  const rowH = ROW_HEIGHT[density];

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-body">
        <thead>
          <tr className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-subtle)]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width }}
                className={cn(
                  'h-10 px-[var(--space-4)] text-meta text-[var(--text-tertiary)] uppercase font-medium text-left whitespace-nowrap',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.sortable && onSort && 'cursor-pointer select-none hover:text-[var(--text-secondary)]',
                )}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                {col.header}
                {col.sortable && (
                  <SortIcon active={sortKey === col.key} dir={sortKey === col.key ? sortDir : undefined} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows count={6} cols={columns.length} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <div className="h-[200px] flex items-center justify-center text-small text-[var(--text-tertiary)]">
                    No results
                  </div>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = getRowKey(row);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    rowH,
                    'border-b border-[var(--border-subtle)] transition-colors',
                    onRowClick && 'cursor-pointer',
                    selectedKey === key
                      ? 'bg-[var(--bg-selected)]'
                      : onRowClick && 'hover:bg-[var(--bg-hover)]',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-[var(--space-4)] align-middle',
                        col.align === 'right' && 'text-right num',
                        col.align === 'center' && 'text-center',
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
