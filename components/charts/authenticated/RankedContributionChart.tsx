import Link from 'next/link';
import { formatNumber } from '@/lib/utils/format';
import { ChartFrame, ChartState, simpleChartTable } from './ChartFrame';
import { finiteNonNegative, type AuthChartDatum } from './types';
import { proportionalLength } from '@/lib/visualisation/proportionalLength';

const CAUSE_RAMP = ['#3c3935', '#625e58', '#6f6a63', '#b7b1aa', '#d8d4cf'] as const;

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
      control={annotation ? <div style={{ display: 'grid', justifyItems: 'end', color: '#6f6a63', fontSize: 10 }}><strong style={{ color: '#1c1f23', font: "500 15px/1.3 'IBM Plex Mono',monospace" }}>{annotation.value}</strong>{annotation.label}</div> : undefined}
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
        <div role="group" data-selected={selectedLabel === rows[0].label ? 'true' : undefined} aria-label={`${rows[0].label}: ${rows[0].displayValue ?? rows[0].value}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, padding: '12px 0' }}>
          <span>
            {rows[0].href ? <Link href={rows[0].href}>{rows[0].label}</Link> : rows[0].label}
          </span>
          <strong style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{rows[0].displayValue ?? formatNumber(rows[0].value)}</strong>
          {rows[0].detail ? <small>{rows[0].detail}</small> : null}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 9 }} role="group" aria-label={rows.map((row) => `${row.label}: ${row.displayValue ?? row.value}`).join(', ')}>
          {rows.map((row, index) => (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,.7fr) minmax(100px,1fr) auto', gap: 10, alignItems: 'center', padding: selectedLabel === row.label ? '5px 7px' : '5px 0', borderRadius: 7, background: selectedLabel === row.label ? '#fff3e9' : 'transparent' }} key={row.label} data-selected={selectedLabel === row.label ? 'true' : undefined}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#40454a', fontSize: 11 }}>
                {index + 1}. {row.href ? <Link href={row.href}>{row.label}</Link> : row.label}
              </span>
              {row.href ? (
                <Link
                  href={row.href}
                  style={{ height: 7, overflow: 'hidden', borderRadius: 4, background: '#ece9e4' }}
                  aria-label={`Open ${row.label}: ${row.displayValue ?? row.value}`}
                >
                  <span
                    style={{ display: 'block', height: '100%', width: `${proportionalLength(row.value, max)}%`, borderRadius: 4, background: causeRamp ? (CAUSE_RAMP[index] ?? '#d8d4cf') : index === 0 ? '#1c1f23' : '#6f6a63' }}
                  />
                </Link>
              ) : (
                <div style={{ height: 7, overflow: 'hidden', borderRadius: 4, background: '#ece9e4' }}>
                  <div
                    style={{ height: '100%', width: `${proportionalLength(row.value, max)}%`, borderRadius: 4, background: causeRamp ? (CAUSE_RAMP[index] ?? '#d8d4cf') : index === 0 ? '#1c1f23' : '#6f6a63' }}
                  />
                </div>
              )}
              <span style={{ color: '#1c1f23', font: "500 11px/1 'IBM Plex Mono',monospace" }}>{row.displayValue ?? formatNumber(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}
