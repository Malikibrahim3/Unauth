'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  DATA_TABLE_EMPTY_STYLE,
  DATA_TABLE_HEAD_ROW_STYLE,
  DATA_TABLE_HEADER_CELL_BASE,
  DATA_TABLE_SKELETON_BAR_STYLE,
  DATA_TABLE_SKELETON_CELL_STYLE,
  DATA_TABLE_STYLE,
} from '@/components/ui/dataTableStyles';

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
  /** Applied to each body row when `onRowClick` is set (e.g. Playwright `customer-row`). */
  rowTestId?: string;
}

const ROW_HEIGHT: Record<TableDensity, number> = {
  compact:  36,
  default:  44,
  relaxed:  52,
};

const SKELETON_ROW_BORDER = { borderBottom: '1px solid var(--border-subtle)' } as const;
const SORT_ICON_STYLE = { opacity: 1 } as const;
const SORT_ICON_MUTED_STYLE = { opacity: 0.35 } as const;

function skeletonBarWidth(colIndex: number): string {
  if (colIndex === 0) return '60%';
  if (colIndex === 1) return '80%';
  return '50%';
}

function SkeletonRows({ count = 6, cols }: { count?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={SKELETON_ROW_BORDER}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={DATA_TABLE_SKELETON_CELL_STYLE} aria-label="Loading row">
              <div
                className="skeleton"
                style={{ ...DATA_TABLE_SKELETON_BAR_STYLE, width: skeletonBarWidth(j) }}
                aria-hidden="true"
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
      style={active ? SORT_ICON_STYLE : SORT_ICON_MUTED_STYLE}
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

function headerCellStyle(col: Column<unknown>, sortable: boolean): React.CSSProperties {
  return {
    ...DATA_TABLE_HEADER_CELL_BASE,
    width: col.width,
    textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
    cursor: sortable ? 'pointer' : undefined,
    userSelect: sortable ? 'none' : undefined,
  };
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
  rowTestId,
}: DataTableProps<T>) {
  const rowH = ROW_HEIGHT[density];

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse" style={DATA_TABLE_STYLE}>
        <thead>
          <tr style={DATA_TABLE_HEAD_ROW_STYLE}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={headerCellStyle(col as Column<unknown>, Boolean(col.sortable && onSort))}
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
                  <div className="flex items-center justify-center" style={DATA_TABLE_EMPTY_STYLE}>
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
                  data-testid={onRowClick && rowTestId ? rowTestId : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    height: rowH,
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--copper-glow)' : undefined,
                    borderLeft: isSelected ? '3px solid var(--copper-bright)' : '3px solid transparent',
                    cursor: onRowClick ? 'pointer' : undefined,
                    transition: 'background 120ms',
                  }}
                  className={onRowClick && !isSelected ? 'hover:bg-[var(--surface-overlay)]' : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '0 14px',
                        verticalAlign: 'middle',
                        textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                        color: 'var(--ink-primary)',
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
