'use client';

import type { ReactNode } from 'react';
import styles from '../AuthenticatedCharts.module.css';
import tabStyles from './MetricTabs.module.css';

export type MetricTabItem = {
  key: string;
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
};

type MetricTabsProps = {
  items: MetricTabItem[];
  active: string;
  onSelect: (key: string) => void;
  'aria-label': string;
};

/**
 * T9 metric tab strip — simultaneously a KPI row and the chart's series selector.
 * Selection carries two cues (icon-chip invert + sunken tile background), never colour alone.
 */
export function MetricTabs({ items, active, onSelect, 'aria-label': ariaLabel }: MetricTabsProps) {
  return (
    <div className={tabStyles.strip} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={selected}
            className={tabStyles.tile}
            data-selected={selected}
            onClick={() => onSelect(item.key)}
          >
            {item.icon ? <span className={tabStyles.iconChip} data-selected={selected}>{item.icon}</span> : null}
            <span className={tabStyles.label}>{item.label}</span>
            <span className={`${tabStyles.value} ${styles.mono}`}>{item.value}</span>
            {item.delta ? <span className={tabStyles.delta}>{item.delta}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Passive, non-switching variant — identical anatomy, no tab semantics (for WorkbenchKpiStrip). */
export function MetricTabsStatic({ items, 'aria-label': ariaLabel }: { items: MetricTabItem[]; 'aria-label': string }) {
  return (
    <dl className={tabStyles.strip} aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.key} className={tabStyles.tile}>
          {item.icon ? <span className={tabStyles.iconChip}>{item.icon}</span> : null}
          <dt className={tabStyles.label}>{item.label}</dt>
          <dd className={`${tabStyles.value} ${styles.mono}`}>{item.value}</dd>
          {item.delta ? <span className={tabStyles.delta}>{item.delta}</span> : null}
        </div>
      ))}
    </dl>
  );
}
