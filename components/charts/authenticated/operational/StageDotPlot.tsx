import Link from 'next/link';
import type { AuthChartTone } from '../types';
import chartStyles from '../AuthenticatedCharts.module.css';
import styles from './StageDotPlot.module.css';

export type StageDotPlotRow = {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  detail?: string;
  href?: string;
  tone: AuthChartTone;
};

export function StageDotPlot({ rows }: { rows: StageDotPlotRow[] }) {
  const maximum = Math.max(0, ...rows.map((row) => row.value ?? 0));

  return (
    <dl
      className={styles.plot}
      aria-label={rows.map((row) => `${row.label}: ${row.displayValue}`).join(', ')}
    >
      {rows.map((row) => {
        const percent = row.value == null || maximum <= 0
          ? null
          : Math.max(row.value > 0 ? 0.75 : 0, Math.min(100, (row.value / maximum) * 100));
        return (
          <div key={row.key} className={styles.row}>
            <dt className={styles.label}>
              {row.href ? <Link href={row.href}>{row.label}</Link> : row.label}
            </dt>
            <dd className={styles.track} aria-hidden="true">
              {percent != null ? (
                <span
                  className={`${styles.dot} ${chartStyles[row.tone]}`}
                  style={{ left: `${percent}%` }}
                />
              ) : null}
            </dd>
            <dd className={styles.value}>
              <strong>{row.displayValue}</strong>
              {row.detail ? <span>{row.detail}</span> : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
