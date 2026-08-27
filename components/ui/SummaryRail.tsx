import { type ReactNode } from 'react';
import Link from '@/components/navigation/AppNavLink';
import { cn } from '@/lib/utils';
import { type StatusTone } from './StatusBadge';

/**
 * SummaryRail — the lightweight side-summary that operational pages render in
 * `WorkbenchPage.rail` in place of a hero chart. A stack of titled cards, each a
 * short list of label/value rows that can carry a tone dot and a thin proportion
 * bar (for distributions), or arbitrary `children` (a SparkTrend, a row of chips).
 *
 * Non-interactive unless a row supplies `href`. Tokens only — no chart JS.
 */

const DOT: Record<StatusTone, string> = {
  neutral: 'var(--uo-route-text-tertiary)',
  info: 'var(--uo-route-info)',
  warning: 'var(--uo-route-warning)',
  success: 'var(--uo-route-success)',
  danger: 'var(--uo-route-risk-critical)',
};

export interface SummaryRailRow {
  label: ReactNode;
  value?: ReactNode;
  /** Leading status dot + default bar colour. */
  tone?: StatusTone;
  /** Proportion 0..1 → a thin bar beneath the row (distribution / share). */
  bar?: number;
  /** Override the bar fill colour (defaults to the tone colour). */
  barColourVar?: string;
  /** Make the row a deep link. */
  href?: string;
}

export interface SummaryRailSection {
  title: string;
  rows?: SummaryRailRow[];
  /** Custom section body (sparkline, chip row, …) rendered above any rows. */
  children?: ReactNode;
  /** Small muted line under the section body. */
  footnote?: string;
}

function Row({ row }: { row: SummaryRailRow }) {
  const dotColour = row.tone ? DOT[row.tone] : undefined;
  const pct = row.bar != null ? Math.max(0, Math.min(1, row.bar)) * 100 : null;
  const fill = row.barColourVar ? `var(${row.barColourVar})` : (dotColour ?? 'var(--uo-route-action-primary)');

  const head = (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2" style={{ color: 'var(--uo-route-text-secondary)', fontSize: 12 }}>
        {dotColour ? (
          <span
            aria-hidden="true"
            className="shrink-0"
            style={{ width: 6, height: 6, borderRadius: '50%', background: dotColour }}
          />
        ) : null}
        <span className="truncate">{row.label}</span>
      </span>
      {row.value != null ? (
        <span
          className="shrink-0 tabular-nums"
          style={{ color: 'var(--uo-route-text-primary)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--uo-route-font-sans)', fontVariantNumeric: 'tabular-nums' }}
        >
          {row.value}
        </span>
      ) : null}
    </div>
  );

  const body = (
    <>
      {head}
      {pct != null ? (
        <div
          className="mt-1.5 overflow-hidden"
          style={{ height: 8, borderRadius: 'var(--uo-route-radius-round)', background: 'var(--uo-route-chart-track)' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: fill, borderRadius: 'var(--uo-route-radius-round)' }} />
        </div>
      ) : null}
    </>
  );

  if (row.href) {
    return (
      <Link
        href={row.href}
        className="-mx-1.5 block rounded-[var(--uo-route-radius-control)] px-1.5 py-1 hover:bg-[var(--uo-route-surface-muted)] focus-visible:shadow-[inset_var(--uo-route-shadow-focus)] focus-visible:outline-none"
      >
        {body}
      </Link>
    );
  }
  return <div>{body}</div>;
}

export function SummaryRail({ sections, className }: { sections: SummaryRailSection[]; className?: string }) {
  return (
    <div className={cn('grid gap-2.5', className)} data-auth-visual="summary-rail">
      {sections.map((section) => (
        <section
          key={section.title}
          style={{
            padding: 14,
            border: '1px solid var(--uo-route-border-default)',
            borderRadius: 'var(--uo-route-radius-surface)',
            background: 'var(--uo-route-surface-primary)',
            boxShadow: 'none',
          }}
        >
          <h2 style={{ margin: 0, color: 'var(--uo-route-text-primary)', fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>{section.title}</h2>
          {section.children ? <div className="mt-3">{section.children}</div> : null}
          {section.rows && section.rows.length > 0 ? (
            <div className="mt-3 space-y-2.5">
              {section.rows.map((row, idx) => (
                <Row key={typeof row.label === 'string' ? row.label : idx} row={row} />
              ))}
            </div>
          ) : null}
          {section.footnote ? (
            <p className="mt-3" style={{ margin: '12px 0 0', color: 'var(--uo-route-text-tertiary)', fontSize: 11, lineHeight: 1.45 }}>
              {section.footnote}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
