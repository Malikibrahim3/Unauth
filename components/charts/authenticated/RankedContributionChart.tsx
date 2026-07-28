import Link from 'next/link';
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
  compact = false,
}: {
  id: string;
  title: string;
  description: string;
  items: AuthChartDatum[];
  annotation?: { value: string; label: string };
  compact?: boolean;
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
      table={rows.map((row) => ({
        label: row.label,
        value: row.displayValue ?? formatNumber(row.value),
        detail: row.detail,
        href: row.href,
      }))}
      compact={compact}
    >
      {max === 0 ? <ChartState title="No attributable value" description="No compatible financial rows are available for this ranked view." /> : rows.length === 1 ? (
        <div className={styles.singleRank} role="group" aria-label={`${rows[0].label}: ${rows[0].displayValue ?? rows[0].value}`}>
          <span>
            {rows[0].href ? <Link href={rows[0].href}>{rows[0].label}</Link> : rows[0].label}
          </span>
          <strong className={styles.mono}>{rows[0].displayValue ?? formatNumber(rows[0].value)}</strong>
          {rows[0].detail ? <small>{rows[0].detail}</small> : null}
        </div>
      ) : (
        <div className={styles.rankedChart} role="img" aria-label={rows.map((row) => `${row.label}: ${row.displayValue ?? row.value}`).join(', ')}>
          {rows.map((row, index) => (
            <div className={styles.rankedRow} key={row.label}>
              <span className={styles.rankedName}>
                {index + 1}. {row.href ? <Link href={row.href}>{row.label}</Link> : row.label}
              </span>
              {row.href ? (
                <Link
                  href={row.href}
                  className={styles.rankedTrack}
                  aria-label={`Open ${row.label}: ${row.displayValue ?? row.value}`}
                >
                  <span className={`${styles.rankedFill} ${styles[row.tone ?? (index === 0 ? 'primary' : 'neutral')]}`} style={{ width: row.value > 0 ? `${Math.max(2, (row.value / max) * 100)}%` : '0%' }} />
                </Link>
              ) : (
                <div className={styles.rankedTrack}>
                  <div className={`${styles.rankedFill} ${styles[row.tone ?? (index === 0 ? 'primary' : 'neutral')]}`} style={{ width: row.value > 0 ? `${Math.max(2, (row.value / max) * 100)}%` : '0%' }} />
                </div>
              )}
              <span className={`${styles.rankedValue} ${styles.mono}`}>{row.displayValue ?? formatNumber(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </ChartPanel>
  );
}
