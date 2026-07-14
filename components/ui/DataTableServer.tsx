import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DATA_TABLE_EMPTY_STYLE,
  DATA_TABLE_HEAD_ROW_STYLE,
  DATA_TABLE_HEADER_CELL_BASE,
  DATA_TABLE_STYLE,
} from "@/components/ui/dataTableStyles";

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
}

const ROW_HEIGHT = { compact: 40, default: 52, relaxed: 60 } as const;

function headerCellStyle<T>(column: ServerDataTableColumn<T>): React.CSSProperties {
  return {
    ...DATA_TABLE_HEADER_CELL_BASE,
    width: column.width,
    textAlign:
      column.align === "right"
        ? "right"
        : column.align === "center"
          ? "center"
          : "left",
  };
}

export function DataTableServer<T>({
  columns,
  rows,
  getRowKey,
  className,
  emptyState,
  density = "default",
}: DataTableServerProps<T>) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-[var(--ua-radius-card)] border bg-[var(--surface)]",
        className,
      )}
      style={{ borderColor: "var(--border)", boxShadow: "none" }}
    >
      <table className="w-full border-separate" style={DATA_TABLE_STYLE}>
        <thead>
          <tr style={DATA_TABLE_HEAD_ROW_STYLE}>
            {columns.map((column) => (
              <th key={column.key} scope="col" style={headerCellStyle(column)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <div
                    className="flex items-center justify-center"
                    style={DATA_TABLE_EMPTY_STYLE}
                  >
                    No results
                  </div>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                style={{
                  height: ROW_HEIGHT[density],
                  borderBottom: "1px solid var(--border-muted)",
                  background: "var(--surface)",
                }}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      padding: "0 var(--space-4)",
                      verticalAlign: "middle",
                      textAlign:
                        column.align === "right"
                          ? "right"
                          : column.align === "center"
                            ? "center"
                            : "left",
                      color: "var(--text-primary)",
                    }}
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
