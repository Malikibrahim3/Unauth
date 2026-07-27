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
 * Metric selector — a mutually exclusive view choice, not a route or tab
 * panel. Selection carries two cues (icon-chip invert + selected tile), never
 * colour alone.
 */
export function MetricTabs({ items, active, onSelect, 'aria-label': ariaLabel }: MetricTabsProps) {
  return (
    <div className={tabStyles.strip} role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={selected}
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
