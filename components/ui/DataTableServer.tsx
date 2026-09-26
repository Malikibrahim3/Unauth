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
    <div className={cn('w-full border-collapse text-[11.5px]', `${density}`, flush && '', persistentHeader && 'flex items-center gap-3', className)} role="region" aria-label={ariaLabel} aria-busy={loading || undefined} tabIndex={persistentHeader ? 0 : undefined}>
      {loading ? <span className="sr-only" role="status">Loading table</span> : null}
      <table className="w-full border-collapse text-[11.5px]">
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col" style={column.width ? { width: column.width } : undefined} className={cn('bg-[#f4f3f1] px-3 py-2 text-left text-[10px] font-semibold uppercase text-[#64686d]', `bg-[#f4f3f1] px-3 py-2 text-left text-[10px] font-semibold uppercase text-[#64686d]${alignment(column)}`, (column.kind === 'numeric' || column.kind === 'currency') && 'bg-[#f4f3f1] px-3 py-2 text-left text-[10px] font-semibold uppercase text-[#64686d]')}>{column.header}</th>)}</tr></thead>
        <tbody>
          {loading ? Array.from({ length: 6 }, (_, row) => <tr key={row}>{columns.map((column, index) => <td key={column.key} className="px-3 py-2.5 align-middle"><span className={cn('skeleton relative', index === 0 && 'relative')} /></td>)}</tr>) : rows.length === 0 ? <tr><td colSpan={columns.length}>{emptyState}</td></tr> : rows.map((row) => <tr key={getRowKey(row)} className="border-t border-[#e4e3e0]">{columns.map((column) => <td key={column.key} className={cn('px-3 py-2.5 align-middle', `px-3 py-2.5 align-middle${alignment(column)}`, (column.kind === 'numeric' || column.kind === 'currency') && 'px-3 py-2.5 align-middle')}>{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
