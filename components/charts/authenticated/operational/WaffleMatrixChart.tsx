import styles from './WaffleMatrixChart.module.css';

export function WaffleMatrixChart({
  percent,
  current,
  stale,
}: {
  percent: number;
  current: number;
  stale: number;
}) {
  const filled = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={styles.wrap}
      role="img"
      aria-label={`${percent}% current source data: ${current} current records and ${stale} stale records`}
    >
      <div className={styles.matrix} aria-hidden="true">
        {Array.from({ length: 100 }, (_, index) => (
          <span key={index} className={styles.cell} data-filled={index < filled} />
        ))}
      </div>
      <div className={styles.summary} aria-hidden="true">
        <strong>{percent}%</strong>
        <span>current source data</span>
      </div>
    </div>
  );
}
