import type { ReactNode } from 'react';
import type { AuthChartTableRow } from './types';
import { ChartDataTable } from './ChartDataTableDisclosure';
import styles from './AuthenticatedCharts.module.css';

export { ChartDataTable } from './ChartDataTableDisclosure';

/*
 * Instrument Grade — the one shared chart frame. Every product chart is a
 * question-led title, a supporting sentence or current value, unit + scope, an
 * optional control, a legend/end labels, the plot, source/freshness metadata, a
 * "View records" drill-down, and an accessible data table. This is the single
 * anatomy; hand-rolling a second panel (as the report view used to) is the
 * duplication Phase 06 removes.
 *
 * The frame stays server-renderable: it holds no browser state. Charts that
 * need pointer/keyboard interaction supply an interactive plot as `children`.
 */

export type ChartDataColumn = {
  key: string;
  header: string;
  /** Right-aligns with tabular figures — for money and counts. */
  numeric?: boolean;
};

export type ChartDataTableModel = {
  /** Accessible caption naming the table; falls back to the frame question. */
  caption?: string;
  /** Column [0] is the row-header column; the rest are data columns. */
  columns: ChartDataColumn[];
  rows: Array<{
    key: string;
    header: ReactNode;
    headerHref?: string;
    /** One cell per data column (i.e. `columns.length - 1` entries). */
    values: ReactNode[];
  }>;
};

/** Maps the legacy single-value {@link AuthChartTableRow} shape onto the
 * flexible table model, so existing label/value/context charts keep their
 * table without bespoke table markup. */
export function simpleChartTable(rows: AuthChartTableRow[], caption?: string): ChartDataTableModel {
  return {
    caption,
    columns: [
      { key: 'item', header: 'Item' },
      { key: 'value', header: 'Value', numeric: true },
      { key: 'context', header: 'Context' },
    ],
    rows: rows.map((row) => ({
      key: `${row.label}-${row.detail ?? ''}`,
      header: row.href ? <a href={row.href}>{row.label}</a> : row.label,
      values: [row.value, row.detail ?? '—'],
    })),
  };
}

/**
 * §6.6 / LP-VIZ-06 — the accessible alternative every meaningful chart exposes.
 * Rendered inside a "View chart data" disclosure so it is keyboard-reachable
 * and exposes the same values a pointer gets from the tooltip. Numeric columns
 * are right-aligned tabular figures; a row may deep-link to its records.
 */
export type ChartFrameProps = {
  id: string;
  /** `data-auth-chart` marker — identifies the encoding, never a hue. */
  kind: string;
  /** 1. question-led title (§6.4: a question or decision statement). */
  question: string;
  /** 2. supporting sentence or current value. */
  summary?: ReactNode;
  /** 3. unit and scope, e.g. "GBP · Last 30 days". */
  scope?: ReactNode;
  /** 4. optional range/metric control (renders top-right). */
  control?: ReactNode;
  /** 5. direct legend or end labels (renders above the plot). */
  legend?: ReactNode;
  /** 6. the plot. */
  children: ReactNode;
  /** 7. source/freshness metadata (renders in the footer). */
  freshness?: ReactNode;
  /** 8. "View records" drill-down (renders in the footer). */
  records?: { href: string; label?: string };
  /** 9. accessible data-table alternative. */
  table?: ChartDataTableModel;
  /** Interpretive caption — the one audited italic; states meaning, not a number. */
  caption?: ReactNode;
  /** Panel-level metric-tab strip (T9). */
  tabs?: ReactNode;
  /** Pin-annotation row above the plot (T6). */
  pins?: ReactNode;
  compact?: boolean;
};

export function ChartFrame({
  id,
  kind,
  question,
  summary,
  scope,
  control,
  legend,
  children,
  freshness,
  records,
  table,
  caption,
  tabs,
  pins,
  compact = false,
}: ChartFrameProps) {
  const titleId = `${id}-title`;
  return (
    <section className={`${styles.panel} ua-focal-panel`} aria-labelledby={titleId} data-auth-chart={kind}>
      <header className={styles.panelHeader}>
        <div className={styles.panelHeading}>
          <h2 id={titleId}>{question}</h2>
          {summary ? <p>{summary}</p> : null}
          {scope ? <p className={styles.scope}>{scope}</p> : null}
        </div>
        {control ? <div className={styles.headerControl}>{control}</div> : null}
      </header>
      {tabs ? <div className={styles.tabStrip}>{tabs}</div> : null}
      {legend ? <div className={styles.legend}>{legend}</div> : null}
      {pins ? <div className={styles.pinRow}>{pins}</div> : null}
      <div className={compact ? styles.compactPlot : styles.plot}>{children}</div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
      {freshness || records ? (
        <div className={styles.frameFooter}>
          <span className={styles.frameFreshness}>{freshness}</span>
          {records ? (
            <a className={styles.recordsLink} href={records.href}>
              {records.label ?? 'View records'}
              <span aria-hidden="true"> →</span>
            </a>
          ) : null}
        </div>
      ) : null}
      {table ? <ChartDataTable model={table} /> : null}
    </section>
  );
}

/** §6.6 data states. `loading` is owned by the geometry-matched skeleton, not
 * this message component; every other state carries an explanation and, where
 * the user can act, a next step. */
export type ChartStateKind =
  | 'empty'
  | 'filtered-empty'
  | 'insufficient-history'
  | 'partial'
  | 'stale'
  | 'disconnected'
  | 'error'
  | 'mixed-currency'
  | 'unavailable'
  | 'refreshing';

export function ChartState({
  kind = 'empty',
  title,
  description,
  action,
  minHeight,
}: {
  kind?: ChartStateKind;
  title: string;
  description?: string;
  /** Relevant next step: "Clear filters", "Retry", "Connect a source". */
  action?: ReactNode;
  minHeight?: number;
}) {
  // Data-integrity states the user must notice announce assertively; the rest
  // are polite status regions so a background refresh never shouts.
  const assertive = kind === 'error' || kind === 'mixed-currency';
  return (
    <div
      className={styles.chartState}
      data-kind={kind}
      role={assertive ? 'alert' : 'status'}
      style={minHeight ? { minHeight } : undefined}
    >
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </div>
  );
}

export function ChartLegend({ items }: { items: Array<{ label: string; tone: string }> }) {
  return (
    <ul className={styles.legendList} aria-label="Chart legend">
      {items.map((item) => (
        <li key={item.label}>
          <i className={styles[item.tone]} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Back-compatibility shim for the pre-Phase-06 `ChartPanel` API. New charts use
 * {@link ChartFrame} directly; this maps the legacy prop names so an unmigrated
 * consumer keeps its exact rendering.
 *
 * @deprecated Use {@link ChartFrame}.
 */
export function ChartPanel({
  id,
  title,
  description,
  annotation,
  legend,
  tabs,
  pins,
  caption,
  children,
  table,
  kind,
  compact = false,
}: {
  id: string;
  title: string;
  description?: string;
  annotation?: ReactNode;
  legend?: ReactNode;
  tabs?: ReactNode;
  pins?: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
  table: AuthChartTableRow[];
  kind: string;
  compact?: boolean;
}) {
  return (
    <ChartFrame
      id={id}
      kind={kind}
      question={title}
      summary={description}
      control={annotation ? <div className={styles.annotation}>{annotation}</div> : undefined}
      legend={legend}
      tabs={tabs}
      pins={pins}
      caption={caption}
      table={table.length ? simpleChartTable(table) : undefined}
      compact={compact}
    >
      {children}
    </ChartFrame>
  );
}
