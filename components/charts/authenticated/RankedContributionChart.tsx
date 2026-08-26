import Link from 'next/link';
import { formatNumber } from '@/lib/utils/format';
import { ChartFrame, ChartState, simpleChartTable } from './ChartFrame';
import { finiteNonNegative, type AuthChartDatum } from './types';
import styles from './AuthenticatedCharts.module.css';
import { proportionalLength } from '@/lib/visualisation/proportionalLength';

const CAUSE_RAMP_TOKENS = ['--uo-route-cause-1', '--uo-route-cause-2', '--uo-route-cause-3', '--uo-route-cause-4', '--uo-route-cause-5'] as const;

export function RankedContributionChart({
  id,
  title,
  description,
  items,
  annotation,
  records,
  selectedLabel,
  compact = false,
  causeRamp = false,
}: {
  id: string;
  title: string;
  description: string;
  items: AuthChartDatum[];
  annotation?: { value: string; label: string };
  /** Optional "View records" drill-down (§6.4 item 8). Server prepares the href. */
  records?: { href: string; label?: string };
  /** Keeps a URL-scoped analytical selection continuous with its records. */
  selectedLabel?: string | null;
  compact?: boolean;
  /**
   * §14.7/§15.2 — this ranking breaks a financial outcome down by cause.
   * Enforces the top-5 + "Other causes" rule and a monochrome ramp off the
   * parent outcome instead of the positional primary/neutral fill. Leave
   * unset for rankings that are not a cause breakdown (recovery stages,
   * evidence gaps) — those keep today's presentation untouched.
   */
  causeRamp?: boolean;
}) {
  const sorted = items
    .map((item) => ({ ...item, value: finiteNonNegative(item.value) }))
    .sort((a, b) => b.value - a.value);
  const rows = causeRamp
    ? (() => {
        const top = sorted.slice(0, 5);
        const remainder = sorted.slice(5);
        const otherValue = remainder.reduce((sum, item) => sum + item.value, 0);
        if (otherValue <= 0) return top;
        const otherShare = remainder.length;
        return [
          ...top,
          {
            label: 'Other causes',
            value: otherValue,
            displayValue: undefined,
            detail: `${otherShare} further cause${otherShare === 1 ? '' : 's'}`,
            href: undefined,
            tone: undefined,
          },
        ];
      })()
    : sorted.slice(0, 6);
  const max = Math.max(0, ...rows.map((row) => row.value));
  return (
    <ChartFrame
      id={id}
      kind="ranked-contribution"
      question={title}
      summary={description}
      control={annotation ? <div className={styles.annotation}><strong>{annotation.value}</strong>{annotation.label}</div> : undefined}
      records={records}
      table={simpleChartTable(rows.map((row) => ({
        label: row.label,
        value: row.displayValue ?? formatNumber(row.value),
        detail: row.detail,
        href: row.href,
      })))}
      compact={compact}
    >
      {rows.length === 0 ? <ChartState kind="empty" title="No attributable value" description="No compatible financial rows are available for this ranked view." /> : rows.length === 1 ? (
        <div className={styles.singleRank} role="group" data-selected={selectedLabel === rows[0].label ? 'true' : undefined} aria-label={`${rows[0].label}: ${rows[0].displayValue ?? rows[0].value}`}>
          <span>
            {rows[0].href ? <Link href={rows[0].href}>{rows[0].label}</Link> : rows[0].label}
          </span>
          <strong className={styles.mono}>{rows[0].displayValue ?? formatNumber(rows[0].value)}</strong>
          {rows[0].detail ? <small>{rows[0].detail}</small> : null}
        </div>
      ) : (
        <div className={styles.rankedChart} role="group" aria-label={rows.map((row) => `${row.label}: ${row.displayValue ?? row.value}`).join(', ')}>
          {rows.map((row, index) => (
            <div className={styles.rankedRow} key={row.label} data-selected={selectedLabel === row.label ? 'true' : undefined}>
              <span className={styles.rankedName}>
                {index + 1}. {row.href ? <Link href={row.href}>{row.label}</Link> : row.label}
              </span>
              {row.href ? (
                <Link
                  href={row.href}
                  className={styles.rankedTrack}
                  aria-label={`Open ${row.label}: ${row.displayValue ?? row.value}`}
                >
                  <span
                    className={causeRamp ? styles.rankedFill : `${styles.rankedFill} ${styles[row.tone ?? (index === 0 ? 'primary' : 'neutral')]}`}
                    style={{ width: `${proportionalLength(row.value, max)}%`, background: causeRamp ? `var(${CAUSE_RAMP_TOKENS[index] ?? '--uo-route-cause-other'})` : undefined }}
                  />
                </Link>
              ) : (
                <div className={styles.rankedTrack}>
                  <div
                    className={causeRamp ? styles.rankedFill : `${styles.rankedFill} ${styles[row.tone ?? (index === 0 ? 'primary' : 'neutral')]}`}
                    style={{ width: `${proportionalLength(row.value, max)}%`, background: causeRamp ? `var(${CAUSE_RAMP_TOKENS[index] ?? '--uo-route-cause-other'})` : undefined }}
                  />
                </div>
              )}
              <span className={`${styles.rankedValue} ${styles.mono}`}>{row.displayValue ?? formatNumber(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}
