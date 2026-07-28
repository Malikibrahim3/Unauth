import type { AuthChartTone } from '../types';
import chartStyles from '../AuthenticatedCharts.module.css';
import styles from './MetricRail.module.css';

export function MetricRail({
  value,
  total,
  label,
  tone = 'primary',
}: {
  value: number;
  total: number;
  label: string;
  tone?: AuthChartTone;
}) {
  const percent = total > 0
    ? Math.max(0, Math.min(100, (Math.max(0, value) / total) * 100))
    : 0;

  return (
    <div className={styles.rail} role="img" aria-label={label}>
      <span
        className={`${styles.fill} ${chartStyles[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
