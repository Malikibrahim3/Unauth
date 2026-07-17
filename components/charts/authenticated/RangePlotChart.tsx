import { formatNumber } from '@/lib/utils/format';
import { ChartPanel, ChartState } from './ChartPanel';
import { finiteNonNegative, percentage, type AuthChartDatum } from './types';
import styles from './AuthenticatedCharts.module.css';

export function RangePlotChart({ id, title, description, total, rows }: { id: string; title: string; description: string; total: number; rows: AuthChartDatum[] }) {
  const safeTotal = finiteNonNegative(total);
  const values = rows.map((row) => ({ ...row, value: Math.min(safeTotal, finiteNonNegative(row.value)) }));
  return (
    <ChartPanel id={id} title={title} description={description} annotation={safeTotal > 0 ? <><strong>{formatNumber(safeTotal)}</strong>customers</> : undefined} kind="range-plot" table={values.map((row) => ({ label: row.label, value: row.displayValue ?? formatNumber(row.value), detail: safeTotal > 0 ? `${Math.round(percentage(row.value, safeTotal))}% of customers` : row.detail }))}>
      {safeTotal === 0 ? <ChartState title="No customer population" description="No customers are available for the current filters." /> : (
        <div className={styles.rangePlot} role="img" aria-label={values.map((row) => `${row.label}: ${row.value} of ${safeTotal}`).join(', ')}>
          <div className={styles.rangeScale}><span /><div className={styles.rangeTicks}><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div><span /></div>
          {values.map((row) => {
            const position = percentage(row.value, safeTotal);
            const tone = row.tone ?? 'blue';
            return <div className={styles.rangeRow} key={row.label}>
              <span className={styles.rangeLabel}>{row.label}</span>
              <div className={styles.rangeTrack}><i className={`${styles.rangeLine} ${styles[tone]}`} style={{ width: `${position}%` }} /><i className={`${styles.rangeDot} ${styles[tone]}`} style={{ left: `${position}%` }} /></div>
              <strong className={styles.rangeValue}>{Math.round(position)}%</strong>
            </div>;
          })}
        </div>
      )}
    </ChartPanel>
  );
}
