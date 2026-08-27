import Link from 'next/link';
import type { AuthChartTone } from '../types';
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

/**
 * §18.4/task-28 — a stage dot plot is a workflow visualisation: it may only
 * ever consume workflow tokens, never outcome or analytical ones. Existing
 * callers still pass the legacy `AuthChartTone` vocabulary (`primary`,
 * `secondary`, …) because they are chart consumers migrated in VP3/VP4, not
 * VP2 — this map is the one place that translates their tone into a
 * workflow-axis colour rather than each stage reading its own hue.
 */
const WORKFLOW_TONE_VAR: Record<AuthChartTone, string> = {
  primary: '--uo-route-workflow-ready',
  positive: '--uo-route-workflow-ready',
  secondary: '--uo-route-workflow-active',
  attention: '--uo-route-workflow-escalated',
  negative: '--uo-route-workflow-blocked',
  neutral: '--uo-route-workflow-closed',
};

export function StageDotPlot({ rows }: { rows: StageDotPlotRow[] }) {
  const maximum = Math.max(0, ...rows.map((row) => row.value ?? 0));

  return (
    <dl
      className={styles.plot}
      aria-label={rows.map((row) => `${row.label}: ${row.displayValue}`).join(', ')}
    >
      {rows.map((row) => {
        const percent = row.value == null
          ? null
          : maximum <= 0
            ? 0
            : Math.max(row.value > 0 ? 0.75 : 0, Math.min(100, (row.value / maximum) * 100));
        return (
          <div
            key={row.key}
            className={styles.row}
            data-stage={row.key}
            data-tone={row.tone}
            data-availability={row.value == null ? 'unavailable' : 'available'}
          >
            <dt className={styles.label}>
              {row.href ? <Link href={row.href}>{row.label}</Link> : row.label}
            </dt>
            <dd className={styles.track} aria-hidden="true">
              {percent != null ? (
                <span
                  className={styles.dot}
                  style={{ left: `${percent}%`, background: `var(${WORKFLOW_TONE_VAR[row.tone]})`, color: `var(${WORKFLOW_TONE_VAR[row.tone]})` }}
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
