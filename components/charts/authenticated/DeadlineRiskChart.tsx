import { formatNumber } from '@/lib/utils/format';
import { ChartPanel, ChartState } from './ChartPanel';
import { finiteNonNegative, type AuthChartDatum } from './types';
import styles from './AuthenticatedCharts.module.css';

export function DeadlineRiskChart({
  id,
  title,
  description,
  bands,
}: {
  id: string;
  title: string;
  description: string;
  bands: Array<AuthChartDatum & { hint?: string }>;
}) {
  const rows = bands.map((band) => ({ ...band, value: finiteNonNegative(band.value) }));
  const max = Math.max(0, ...rows.map((row) => row.value));
  return (
    <ChartPanel
      id={id}
      title={title}
      description={description}
      annotation={max > 0 ? <><strong>{formatNumber(rows.reduce((sum, row) => sum + row.value, 0))}</strong>active tasks</> : undefined}
      kind="deadline-risk"
      table={rows.map((row) => ({ label: row.label, value: row.displayValue ?? formatNumber(row.value), detail: row.hint }))}
    >
      {max === 0 ? <ChartState title="No active deadlines" description="There are no active tasks in the current merchant work population." /> : (
        <div className={styles.riskChart} role="img" aria-label={rows.map((row) => `${row.label}: ${row.value}`).join(', ')}>
          {rows.map((row) => (
            <div className={styles.riskRow} key={row.label}>
              <div className={styles.riskLabel}><strong>{row.label}</strong>{row.hint ? <span>{row.hint}</span> : null}</div>
              <div className={styles.riskTrack}><div className={`${styles.riskFill} ${styles[row.tone ?? 'neutral']}`} style={{ width: row.value > 0 ? `${Math.max(2, (row.value / max) * 100)}%` : '0%' }} /></div>
              <span className={styles.riskValue}>{row.displayValue ?? formatNumber(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </ChartPanel>
  );
}
