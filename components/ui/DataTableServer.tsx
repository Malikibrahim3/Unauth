import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ServerDataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
  width?: string;
}

export interface DataTableServerProps<T> {
  columns: ServerDataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  className?: string;
  emptyState?: ReactNode;
  density?: "default" | "compact" | "relaxed";
  loading?: boolean;
  'aria-label'?: string;
}

export function DataTableServer<T>({
  columns,
  rows,
  getRowKey,
  className,
  emptyState,
  density = "default",
  loading = false,
  'aria-label': ariaLabel = 'Data table',
}: DataTableServerProps<T>) {
  return (
    <div
      className={cn(
        "ua-data-table",
        `ua-data-table--density-${density}`,
        className,
      )}
      role="region"
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="sr-only" role="status">Loading table</span> : null}
      <table className="ua-data-table__table">
        <thead>
          <tr className="ua-data-table__head-row">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "ua-data-table__header-cell",
                  column.align === "right" && "ua-data-table__header-cell--right",
                  column.align === "center" && "ua-data-table__header-cell--center",
                )}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }, (_, rowIndex) => (
              <tr key={`loading-${rowIndex}`} aria-hidden="true">
                {columns.map((column, columnIndex) => (
                  <td key={column.key} className="ua-data-table__skeleton-cell">
                    <div className={cn("skeleton ua-data-table__skeleton-bar", columnIndex === 0 && "ua-data-table__skeleton-bar--primary", columnIndex === 1 && "ua-data-table__skeleton-bar--secondary")} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <div
                    className="ua-data-table__empty"
                  >
                    No matching records
                  </div>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="ua-data-table__row"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "ua-data-table__cell",
                      column.align === "right" && "ua-data-table__cell--right",
                      column.align === "center" && "ua-data-table__cell--center",
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
