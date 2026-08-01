'use client';

import type { RefObject } from 'react';
import type { ChartDataTableModel } from './ChartFrame';
import styles from './AuthenticatedCharts.module.css';

/**
 * Interactive disclosure for the accessible chart-data alternative. Keeping
 * the native details event in this client boundary lets ChartFrame remain
 * server-renderable for every route that does not need controlled disclosure.
 */
export function ChartDataTable({
  model,
  defaultOpen = false,
  open,
  onOpenChange,
  summaryRef,
  summaryLabel = 'View chart data',
}: {
  model: ChartDataTableModel;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  summaryRef?: RefObject<HTMLElement | null>;
  summaryLabel?: string;
}) {
  if (!model.rows.length) return null;
  const [rowHeaderColumn, ...dataColumns] = model.columns;

  return (
    <details
      className={styles.dataDetails}
      open={open ?? (defaultOpen ? true : undefined)}
      onToggle={onOpenChange ? (event) => onOpenChange(event.currentTarget.open) : undefined}
    >
      <summary ref={summaryRef}>{summaryLabel}</summary>
      <div className={styles.dataTableWrap}>
        <table>
          {model.caption ? <caption className={styles.tableCaption}>{model.caption}</caption> : null}
          <thead>
            <tr>
              <th scope="col">{rowHeaderColumn.header}</th>
              {dataColumns.map((column) => (
                <th key={column.key} scope="col" className={column.numeric ? styles.numericCol : undefined}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.headerHref ? <a href={row.headerHref}>{row.header}</a> : row.header}</th>
                {row.values.map((value, index) => (
                  <td
                    key={dataColumns[index]?.key ?? index}
                    className={dataColumns[index]?.numeric ? styles.numericCol : undefined}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
