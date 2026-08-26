"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import Link from "@/components/navigation/AppNavLink";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RowActionsMenu, type RowAction } from "@/components/ui/RowActionsMenu";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Text alternative used when an interactive/custom header is sortable. */
  headerLabel?: string;
  align?: "left" | "right" | "center";
  kind?: "text" | "numeric" | "currency" | "date" | "status" | "action";
  sortable?: boolean;
  render: (row: T) => ReactNode;
  width?: string;
  /** Guarantees a pill/badge column can't clip at 1280px (F-28). */
  minWidth?: string;
}

type TableDensity = "metadata" | "default" | "rich" | "two-line";

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Handler for the explicit primary identity-cell button. Rows are never interactive. */
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  loading?: boolean;
  density?: TableDensity;
  selectedKey?: string;
  className?: string;
  /**
   * Render as the body of a `RegistrySurface`: drops the table's own border,
   * radius, and background so the surface owns the single frame (§8.3 "one
   * surface"). Horizontal overflow still stays inside this region.
   */
  flush?: boolean;
  emptyState: ReactNode;
  /** Applied to each body row when `onRowClick` is set (e.g. Playwright `customer-row`). */
  rowTestId?: string;
  /** Per-row action menu (WS4.2). Renders a hover/focus-revealed `⋯` menu in a trailing column. */
  rowActions?: (row: T) => RowAction[];
  /** Optional real link in the primary identity cell. */
  primaryColumnKey?: string;
  getRowHref?: (row: T) => string;
  /** Optional real button in the primary identity cell for contextual previews. */
  primaryActionLabel?: (row: T) => string;
  /** Make this labelled table region the sole scroll owner and retain its headings. */
  persistentHeader?: boolean;
  'aria-label'?: string;
}

/* Widest at the primary column, narrowing toward trailing metadata (§7.3) —
 * the previous two-tone scheme had the first column narrower than the
 * second, the reverse of how a real row reads. */
const SKELETON_BAR_WIDTHS = [68, 44, 32, 32, 24];

function skeletonBarWidth(colIndex: number): number {
  return SKELETON_BAR_WIDTHS[colIndex] ?? SKELETON_BAR_WIDTHS[SKELETON_BAR_WIDTHS.length - 1];
}

function columnAlign<T>(column: DataTableColumn<T>): "left" | "right" | "center" {
  if (column.align) return column.align;
  if (column.kind === "numeric" || column.kind === "currency" || column.kind === "date") return "right";
  if (column.kind === "status" || column.kind === "action") return "center";
  return "left";
}

function SkeletonRows({ count = 6, cols }: { count?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="ua-data-table__skeleton-row">
          {Array.from({ length: cols }).map((_, j) => (
            <td
              key={j}
              className="ua-data-table__skeleton-cell"
              aria-hidden="true"
            >
              <div
                className="skeleton ua-data-table__skeleton-bar"
                style={{ width: `${skeletonBarWidth(j)}%` }}
                aria-hidden="true"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
  const Icon = !active
    ? ChevronsUpDown
    : dir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <Icon
      className={cn(
        "ua-data-table__sort-icon shrink-0",
        !active && "ua-data-table__sort-icon--muted",
      )}
      aria-hidden="true"
    />
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
  density = "default",
  selectedKey,
  className,
  flush = false,
  emptyState,
  rowTestId,
  rowActions,
  primaryColumnKey,
  getRowHref,
  primaryActionLabel,
  persistentHeader = false,
  'aria-label': ariaLabel = 'Data table',
}: DataTableProps<T>) {
  const totalCols = columns.length + (rowActions ? 1 : 0);

  return (
    <div
      className={cn(
        "ua-data-table",
        `ua-data-table--density-${density}`,
        flush && "ua-data-table--flush",
        persistentHeader && "ua-data-table--persistent-header",
        className,
      )}
      role="region"
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      tabIndex={persistentHeader ? 0 : undefined}
    >
      {loading ? <span className="sr-only" role="status">Loading table</span> : null}
      <table className="ua-data-table__table">
        <thead>
          <tr className="ua-data-table__head-row">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "ua-data-table__header-cell",
                  columnAlign(col) === "right" && "ua-data-table__header-cell--right",
                  columnAlign(col) === "center" && "ua-data-table__header-cell--center",
                  (col.kind === "numeric" || col.kind === "currency") && "ua-data-table__header-cell--numeric",
                  col.sortable && onSort && "ua-data-table__header-cell--sortable",
                )}
                style={col.width || col.minWidth ? { width: col.width, minWidth: col.minWidth } : undefined}
              >
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--uo-route-border-focus)]"
                    onClick={() => onSort(col.key)}
                    aria-label={`Sort by ${col.headerLabel ?? (typeof col.header === "string" ? col.header : col.key)}${sortKey === col.key ? `, currently ${sortDir === "asc" ? "ascending" : "descending"}` : ""}`}
                  >
                    {col.header}
                    <SortIcon
                      active={sortKey === col.key}
                      dir={sortKey === col.key ? sortDir : undefined}
                    />
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
            {rowActions ? (
              <th scope="col" className="ua-data-table__header-cell ua-data-table__header-cell--right">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows count={6} cols={totalCols} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={totalCols}>
                {emptyState}
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
                  data-row-key={onRowClick && rowTestId ? key : undefined}
                  aria-selected={selectedKey !== undefined ? isSelected : undefined}
                  className={cn(
                    "ua-data-table__row",
                    isSelected && "ua-data-table__row--selected",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "ua-data-table__cell",
                        columnAlign(col) === "right" && "ua-data-table__cell--right",
                        columnAlign(col) === "center" && "ua-data-table__cell--center",
                        (col.kind === "numeric" || col.kind === "currency") && "ua-data-table__cell--numeric",
                      )}
                    >
                      {getRowHref && col.key === (primaryColumnKey ?? columns[0]?.key) ? (
                        <Link
                          href={getRowHref(row)}
                          className="inline-flex min-w-0 items-center text-left focus-visible:outline-none"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {col.render(row)}
                        </Link>
                      ) : onRowClick && col.key === (primaryColumnKey ?? columns[0]?.key) && primaryActionLabel ? (
                        <button
                          type="button"
                          className="block w-full min-w-0 text-left focus-visible:outline-none"
                          aria-label={primaryActionLabel(row)}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRowClick(row);
                          }}
                        >
                          {col.render(row)}
                        </button>
                      ) : col.render(row)}
                    </td>
                  ))}
                  {rowActions ? (
                    <td
                      className="ua-data-table__actions-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActionsMenu actions={rowActions(row)} />
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
