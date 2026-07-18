import { type ReactNode } from 'react';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';
import { SparkTrend } from '@/components/charts/authenticated/micro/SparkTrend';

export interface WorkbenchKpiItem {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Optional lightweight trend sparkline (≥2 points) rendered beside the value. */
  trend?: number[];
  /** Chart token for the sparkline stroke (default --ua-chart-blue). */
  trendColourVar?: string;
}

interface WorkbenchKpiStripProps {
  items: WorkbenchKpiItem[];
  colsClassName?: string;
}

export function WorkbenchKpiStrip({ items, colsClassName = 'grid-cols-2 md:grid-cols-5' }: WorkbenchKpiStripProps) {
  return (
    <dl className={`${styles.kpiStrip} ${colsClassName}`} aria-label="Key metrics">
      {items.map((item, idx) => (
        <div
          key={item.label}
          className={styles.kpiItem}
          data-capability-id={`metric.${idx + 1}`}
        >
          <dt className={styles.kpiLabel}>{item.label}</dt>
          <dd className={styles.kpiValue}>
            {item.trend && item.trend.length >= 2 ? (
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 overflow-hidden text-ellipsis">{item.value}</span>
                <SparkTrend values={item.trend} colourVar={item.trendColourVar} />
              </span>
            ) : (
              item.value
            )}
          </dd>
          {item.hint ? <p className={styles.kpiHint}>{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}
