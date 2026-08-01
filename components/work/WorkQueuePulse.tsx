import Link from 'next/link';
import type { WorkDueBandKey } from '@/lib/work/store';
import { formatNumber } from '@/lib/utils/format';
import styles from './WorkQueuePulse.module.css';

/**
 * Queue pulse (§6.8, §5.4). One question: **when will the queue become risky?**
 *
 * Encoding is a stacked due-band bar over item count, with the same bands
 * repeated as a labelled row list so the reading never depends on colour or on
 * segment width alone. Selecting a band filters the queue below by navigating to
 * that view — a presentation filter on this route, not a new mutation.
 *
 * Only `overdue` carries a semantic hue, because "past its deadline" is itself a
 * critical state. Every other band is neutral or accent-when-selected: a future
 * deadline is not a warning (§3.3).
 */
export type WorkQueuePulseBand = {
  key: WorkDueBandKey;
  label: string;
  count: number;
};

const BAND_ORDER: Array<{ key: WorkDueBandKey; label: string }> = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'due-today', label: 'Due today' },
  { key: 'due-1-3', label: 'In 1–3 days' },
  { key: 'due-4-7', label: 'In 4–7 days' },
  { key: 'due-later', label: 'Later' },
  { key: 'no-sla', label: 'No deadline' },
];

export function WorkQueuePulse({
  bands,
  view,
  query = '',
}: {
  bands: Record<WorkDueBandKey, number>;
  view: string;
  /** Retains the operator's current client-side search when drilling into a due band. */
  query?: string;
}) {
  const rows = BAND_ORDER.map((band) => ({ ...band, count: bands[band.key] ?? 0 }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (total === 0) {
    return (
      <section className={styles.frame} aria-labelledby="queue-pulse-title">
        <h2 id="queue-pulse-title" className={styles.title}>
          When will the queue become risky?
        </h2>
        <p className={styles.state} role="status">
          No active work carries a deadline yet. Bands appear once tasks have due dates.
        </p>
      </section>
    );
  }

  const atRisk = (bands.overdue ?? 0) + (bands['due-today'] ?? 0);
  const workHref = (nextView: string) => {
    const params = new URLSearchParams({ view: nextView });
    if (query.trim()) params.set('q', query.trim());
    return `/work?${params.toString()}`;
  };

  return (
    <section className={styles.frame} aria-labelledby="queue-pulse-title">
      <header className={styles.header}>
        <div>
          <h2 id="queue-pulse-title" className={styles.title}>
            When will the queue become risky?
          </h2>
          <p className={styles.subtitle}>
            {formatNumber(atRisk)} of {formatNumber(total)} active items are overdue or due today ·
            item count by deadline
          </p>
        </div>
      </header>

      <div className={styles.stack} aria-hidden="true">
        {rows
          .filter((row) => row.count > 0)
          .map((row) => (
            <span
              key={row.key}
              className={styles.segment}
              data-band={row.key}
              data-selected={view === row.key ? 'true' : undefined}
              style={{ flexGrow: row.count }}
            />
          ))}
      </div>

      <ul className={styles.bands}>
        {rows.map((row) => (
          <li key={row.key}>
            <Link
              href={workHref(row.key)}
              className={styles.band}
              data-band={row.key}
              aria-current={view === row.key ? 'page' : undefined}
            >
              <span className={styles.bandKey} data-band={row.key} aria-hidden="true" />
              <span className={styles.bandLabel}>{row.label}</span>
              <span className={styles.bandCount}>{formatNumber(row.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
