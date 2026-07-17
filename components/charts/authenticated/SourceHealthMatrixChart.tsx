import type { CSSProperties } from 'react';
import { ChartPanel, ChartState } from './ChartPanel';
import type { AuthChartTone } from './types';
import styles from './AuthenticatedCharts.module.css';

export type SourceHealthRow = {
  label: string;
  cells: Array<{ label: string; value: string; tone: AuthChartTone }>;
};

export function SourceHealthMatrixChart({ id, title, description, columns, rows }: { id: string; title: string; description: string; columns: string[]; rows: SourceHealthRow[] }) {
  return (
    <ChartPanel id={id} title={title} description={description} kind="source-health-matrix" table={rows.flatMap((row) => row.cells.map((cell) => ({ label: `${row.label} · ${cell.label}`, value: cell.value })))}>
      {rows.length === 0 ? <ChartState title="No visible providers" description="No provider catalogue rows are available for this merchant." /> : (
        <div className={styles.healthMatrix} style={{ '--health-columns': columns.length } as CSSProperties}>
          <div className={styles.healthHeader}>Provider</div>
          {columns.map((column) => <div className={styles.healthHeader} key={column}>{column}</div>)}
          {rows.slice(0, 10).map((row) => (
            <div className={styles.healthMatrixRow} key={row.label}>
              <div className={styles.healthProvider}>{row.label}</div>
              {row.cells.map((cell) => <div className={styles.healthCell} key={`${row.label}-${cell.label}`}><i className={styles[cell.tone]} aria-hidden="true" /><span>{cell.value}</span></div>)}
            </div>
          ))}
        </div>
      )}
    </ChartPanel>
  );
}
