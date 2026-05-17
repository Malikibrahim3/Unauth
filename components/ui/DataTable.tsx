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

const ROW_HEIGHT: Record<TableDensity, number> = {
  compact:  36,
  default:  44,
  relaxed:  52,
};

function SkeletonRows({ count = 6, cols }: { count?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '10px 14px' }}>
              <div
                className="skeleton"
                style={{
                  height: 12,
                  borderRadius: 2,
                  width: j === 0 ? '60%' : j === 1 ? '80%' : '50%',
                }}
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
      className={cn('ml-1 w-3 h-3 inline-block shrink-0')}
      viewBox="0 0 10 12"
      fill="currentColor"
      aria-hidden="true"
      style={{ opacity: active ? 1 : 0.35 }}
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
      <table className="w-full border-collapse" style={{ fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-default)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{
                  width: col.width,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  padding: '0 14px',
                  height: 36,
                  whiteSpace: 'nowrap',
                  textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                  cursor: col.sortable && onSort ? 'pointer' : undefined,
                  userSelect: col.sortable && onSort ? 'none' : undefined,
                }}
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
                  <div
                    className="flex items-center justify-center"
                    style={{ height: 200, fontSize: 12, color: 'var(--text-muted)' }}
                  >
                    No results
                  </div>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = getRowKey(row);
              const isSelected = selectedKey === key;
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    height: rowH,
                    borderBottom: '1px solid var(--border-default)',
                    background: isSelected ? 'var(--bg-subtle)' : undefined,
                    borderLeft: isSelected ? '2px solid #7B2D26' : '2px solid transparent',
                    cursor: onRowClick ? 'pointer' : undefined,
                    transition: 'background 120ms',
                  }}
                  className={onRowClick && !isSelected ? 'hover:bg-[var(--bg-subtle)]' : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '0 14px',
                        verticalAlign: 'middle',
                        textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                        color: 'var(--text)',
                      }}
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
