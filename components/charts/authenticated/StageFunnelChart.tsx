import { formatNumber } from '@/lib/utils/format';
import { ChartPanel, ChartState } from './ChartPanel';
import { finiteNonNegative, type AuthChartDatum } from './types';
import styles from './AuthenticatedCharts.module.css';

export function StageFunnelChart({ id, title, description, stages }: { id: string; title: string; description: string; stages: AuthChartDatum[] }) {
  const rows = stages.map((stage) => ({ ...stage, value: finiteNonNegative(stage.value) }));
  const max = Math.max(0, ...rows.map((row) => row.value));
  return (
    <ChartPanel id={id} title={title} description={description} kind="stage-funnel" table={rows.map((row) => ({ label: row.label, value: row.displayValue ?? formatNumber(row.value), detail: row.detail }))}>
      {max === 0 ? <ChartState title="No recovery stages" description="No recovery cases are available for this workflow view." /> : (
        <div className={styles.funnel} role="img" aria-label={rows.map((row) => `${row.label}: ${row.value}`).join(', ')}>
          {rows.map((row) => (
            <div className={styles.funnelStage} key={row.label}>
              <span className={styles.funnelLabel}>{row.label}</span>
              <div className={`${styles.funnelBar} ${styles[row.tone ?? 'neutral']}`} style={{ width: row.value > 0 ? `${Math.max(14, (row.value / max) * 100)}%` : '0%' }} />
              <strong className={styles.funnelValue}>{row.displayValue ?? formatNumber(row.value)}</strong>
            </div>
          ))}
        </div>
      )}
    </ChartPanel>
  );
}
