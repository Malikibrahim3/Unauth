import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ServerDataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  kind?: 'text' | 'numeric' | 'currency' | 'date' | 'status' | 'action';
  render: (row: T) => ReactNode;
  width?: string;
}

export interface DataTableServerProps<T> {
  columns: ServerDataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  className?: string;
  emptyState: ReactNode;
  density?: 'metadata' | 'default' | 'rich' | 'two-line';
  flush?: boolean;
  loading?: boolean;
  /** Make this labelled table region the sole scroll owner and retain its headings. */
  persistentHeader?: boolean;
  'aria-label'?: string;
}

function alignment<T>(column: ServerDataTableColumn<T>) {
  return column.align ?? (column.kind === 'numeric' || column.kind === 'currency' || column.kind === 'date' ? 'right' : column.kind === 'status' || column.kind === 'action' ? 'center' : 'left');
}

export function DataTableServer<T>({ columns, rows, getRowKey, className, emptyState, density = 'default', flush = false, loading = false, persistentHeader = false, 'aria-label': ariaLabel = 'Data table' }: DataTableServerProps<T>) {
  return (
    <div className={cn('ua-data-table', `ua-data-table--density-${density}`, flush && 'ua-data-table--flush', persistentHeader && 'ua-data-table--persistent-header', className)} role="region" aria-label={ariaLabel} aria-busy={loading || undefined} tabIndex={persistentHeader ? 0 : undefined}>
      {loading ? <span className="sr-only" role="status">Loading table</span> : null}
      <table className="ua-data-table__table">
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col" style={column.width ? { width: column.width } : undefined} className={cn('ua-data-table__header-cell', `ua-data-table__header-cell--${alignment(column)}`, (column.kind === 'numeric' || column.kind === 'currency') && 'ua-data-table__header-cell--numeric')}>{column.header}</th>)}</tr></thead>
        <tbody>
          {loading ? Array.from({ length: 6 }, (_, row) => <tr key={row}>{columns.map((column, index) => <td key={column.key} className="ua-data-table__cell"><span className={cn('skeleton ua-data-table__skeleton-bar', index === 0 && 'ua-data-table__skeleton-bar--primary')} /></td>)}</tr>) : rows.length === 0 ? <tr><td colSpan={columns.length}>{emptyState}</td></tr> : rows.map((row) => <tr key={getRowKey(row)} className="ua-data-table__row">{columns.map((column) => <td key={column.key} className={cn('ua-data-table__cell', `ua-data-table__cell--${alignment(column)}`, (column.kind === 'numeric' || column.kind === 'currency') && 'ua-data-table__cell--numeric')}>{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
