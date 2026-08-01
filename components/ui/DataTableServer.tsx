import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ServerDataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  kind?: "text" | "numeric" | "currency" | "date" | "status" | "action";
  render: (row: T) => ReactNode;
  width?: string;
}

export interface DataTableServerProps<T> {
  columns: ServerDataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  className?: string;
  emptyState: ReactNode;
  density?: "default" | "compact" | "relaxed";
  /** Render inside a RegistrySurface, which owns the outer frame. */
  flush?: boolean;
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
  flush = false,
  loading = false,
  'aria-label': ariaLabel = 'Data table',
}: DataTableServerProps<T>) {
  const columnAlign = (column: ServerDataTableColumn<T>): "left" | "right" | "center" => {
    if (column.align) return column.align;
    if (column.kind === "numeric" || column.kind === "currency" || column.kind === "date") return "right";
    if (column.kind === "status" || column.kind === "action") return "center";
    return "left";
  };

  return (
    <div
      className={cn(
        "ua-data-table",
        `ua-data-table--density-${density}`,
        flush && "ua-data-table--flush",
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
                  columnAlign(column) === "right" && "ua-data-table__header-cell--right",
                  columnAlign(column) === "center" && "ua-data-table__header-cell--center",
                  (column.kind === "numeric" || column.kind === "currency") && "ua-data-table__header-cell--numeric",
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
                {emptyState}
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
                      columnAlign(column) === "right" && "ua-data-table__cell--right",
                      columnAlign(column) === "center" && "ua-data-table__cell--center",
                      (column.kind === "numeric" || column.kind === "currency") && "ua-data-table__cell--numeric",
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
