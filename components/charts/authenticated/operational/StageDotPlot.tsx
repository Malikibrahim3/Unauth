import Link from 'next/link';
import type { AuthChartTone } from '../types';

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
  primary: '--authority-workflow-ready',
  positive: '--authority-workflow-ready',
  secondary: '--authority-workflow-active',
  attention: '--authority-workflow-escalated',
  negative: '--authority-workflow-blocked',
  neutral: '--authority-workflow-closed',
};

export function StageDotPlot({ rows }: { rows: StageDotPlotRow[] }) {
  const maximum = Math.max(0, ...rows.map((row) => row.value ?? 0));

  return (
    <dl
      style={{ display: 'grid', gap: 0, margin: 0 }}
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
            style={{ display: 'grid', gridTemplateColumns: '150px minmax(100px,1fr) 118px', gap: 12, alignItems: 'center', minHeight: 38, borderTop: '1px solid #f4f2ef' }}
            data-stage={row.key}
            data-tone={row.tone}
            data-availability={row.value == null ? 'unavailable' : 'available'}
          >
            <dt style={{ color: '#40454a', fontSize: 11.5 }}>
              {row.href ? <Link href={row.href}>{row.label}</Link> : row.label}
            </dt>
            <dd style={{ position: 'relative', height: 1, margin: 0, background: '#e4e3e0' }} aria-hidden="true">
              {percent != null ? (
                <span
                  style={{ position: 'absolute', top: -4, left: `${percent}%`, width: 9, height: 9, marginLeft: -4, borderRadius: '50%', background: `var(${WORKFLOW_TONE_VAR[row.tone]})`, color: `var(${WORKFLOW_TONE_VAR[row.tone]})` }}
                />
              ) : null}
            </dd>
            <dd style={{ display: 'grid', justifyItems: 'end', gap: 2, margin: 0, fontSize: 10, color: '#6f6a63' }}>
              <strong>{row.displayValue}</strong>
              {row.detail ? <span>{row.detail}</span> : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
