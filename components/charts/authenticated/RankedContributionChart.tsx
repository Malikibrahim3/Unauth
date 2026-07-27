import { formatNumber } from '@/lib/utils/format';
import { ChartPanel, ChartState } from './ChartPanel';
import { finiteNonNegative, type AuthChartDatum } from './types';
import styles from './AuthenticatedCharts.module.css';

export function RankedContributionChart({
  id,
  title,
  description,
  items,
  annotation,
}: {
  id: string;
  title: string;
  description: string;
  items: AuthChartDatum[];
  annotation?: { value: string; label: string };
}) {
  const rows = items
    .map((item) => ({ ...item, value: finiteNonNegative(item.value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const max = Math.max(0, ...rows.map((row) => row.value));
  return (
    <ChartPanel
      id={id}
      title={title}
      description={description}
      annotation={annotation ? <><strong>{annotation.value}</strong>{annotation.label}</> : undefined}
      kind="ranked-contribution"
      table={rows.map((row) => ({ label: row.label, value: row.displayValue ?? formatNumber(row.value), detail: row.detail }))}
    >
      {max === 0 ? <ChartState title="No attributable value" description="No compatible financial rows are available for this ranked view." /> : (
        <div className={styles.rankedChart} role="img" aria-label={rows.map((row) => `${row.label}: ${row.displayValue ?? row.value}`).join(', ')}>
          {rows.map((row, index) => (
            <div className={styles.rankedRow} key={row.label}>
              <span className={styles.rankedName}>{index + 1}. {row.label}</span>
              <div className={styles.rankedTrack}><div className={`${styles.rankedFill} ${styles[row.tone ?? (index === 0 ? 'primary' : 'neutral')]}`} style={{ width: row.value > 0 ? `${Math.max(2, (row.value / max) * 100)}%` : '0%' }} /></div>
              <span className={`${styles.rankedValue} ${styles.mono}`}>{row.displayValue ?? formatNumber(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </ChartPanel>
  );
}
