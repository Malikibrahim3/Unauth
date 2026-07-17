import type { CSSProperties } from 'react';
import { formatNumber } from '@/lib/utils/format';
import { ChartLegend, ChartPanel, ChartState } from './ChartPanel';
import { finiteNonNegative, type AuthChartDatum } from './types';
import styles from './AuthenticatedCharts.module.css';

export function ColumnComparisonChart({
  id,
  title,
  description,
  columns,
  annotation,
}: {
  id: string;
  title: string;
  description: string;
  columns: AuthChartDatum[];
  annotation?: { value: string; label: string };
}) {
  const rows = columns.map((column) => ({ ...column, value: finiteNonNegative(column.value) }));
  const max = Math.max(0, ...rows.map((row) => row.value));
  const legend = [...new Map(rows.map((row) => [row.tone ?? 'neutral', { label: row.detail ?? row.label, tone: row.tone ?? 'neutral' }])).values()];
  return (
    <ChartPanel
      id={id}
      title={title}
      description={description}
      annotation={annotation ? <><strong>{annotation.value}</strong>{annotation.label}</> : undefined}
      legend={legend.length > 1 ? <ChartLegend items={legend} /> : undefined}
      kind="column-comparison"
      table={rows.map((row) => ({ label: row.label, value: row.displayValue ?? formatNumber(row.value), detail: row.detail }))}
    >
      {max === 0 ? <ChartState title="No cases in this population" description="No current records are available for this comparison." /> : (
        <div className={styles.columnChart} style={{ '--columns': rows.length } as CSSProperties} role="img" aria-label={rows.map((row) => `${row.label}: ${row.value}`).join(', ')}>
          {rows.map((row) => (
            <div className={styles.column} key={row.label}>
              <div className={`${styles.columnBar} ${styles[row.tone ?? 'neutral']}`} style={{ height: row.value > 0 ? `${Math.max(2, (row.value / max) * 100)}%` : '0%' }} />
              <strong>{row.displayValue ?? formatNumber(row.value)}</strong>
              <span>{row.label}</span>
            </div>
          ))}
        </div>
      )}
    </ChartPanel>
  );
}
