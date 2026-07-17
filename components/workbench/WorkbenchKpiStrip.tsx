import { type ReactNode } from 'react';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

export interface WorkbenchKpiItem {
  label: string;
  value: ReactNode;
  hint?: string;
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
          <dd className={styles.kpiValue}>{item.value}</dd>
          {item.hint ? <p className={styles.kpiHint}>{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}
