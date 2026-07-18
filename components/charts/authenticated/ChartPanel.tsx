import type { ReactNode } from 'react';
import type { AuthChartTableRow } from './types';
import styles from './AuthenticatedCharts.module.css';

type ChartPanelProps = {
  id: string;
  title: string;
  description?: string;
  annotation?: ReactNode;
  legend?: ReactNode;
  /** T9 metric-tab strip — renders below the header, above the plot; tabs own the chart's series selection. */
  tabs?: ReactNode;
  /** T6 pin-annotation row — renders above the plot, inside its padding. */
  pins?: ReactNode;
  /** T7 interpretive caption — the one audited italic in the product; states interpretation, never a number. */
  caption?: ReactNode;
  children: ReactNode;
  table: AuthChartTableRow[];
  kind: string;
  compact?: boolean;
};

/** Shared chart shell derived from the reference dashboard's compact cards. */
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
}: ChartPanelProps) {
  const titleId = `${id}-title`;
  return (
    <section
      className={`${styles.panel} ua-focal-panel`}
      aria-labelledby={titleId}
      data-auth-chart={kind}
    >
      <header className={styles.panelHeader}>
        <div className={styles.panelHeading}>
          <h2 id={titleId}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {annotation ? <div className={styles.annotation}>{annotation}</div> : null}
      </header>
      {tabs ? <div className={styles.tabStrip}>{tabs}</div> : null}
      {legend ? <div className={styles.legend}>{legend}</div> : null}
      {pins ? <div className={styles.pinRow}>{pins}</div> : null}
      <div className={compact ? styles.compactPlot : styles.plot}>{children}</div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
      {table.length > 0 ? (
        <details className={styles.dataDetails}>
          <summary>View chart data</summary>
          <div className={styles.dataTableWrap}>
            <table>
              <thead><tr><th scope="col">Item</th><th scope="col">Value</th><th scope="col">Context</th></tr></thead>
              <tbody>
                {table.map((row) => (
                  <tr key={`${row.label}-${row.detail ?? ''}`}>
                    <th scope="row">
                      {row.href ? <a href={row.href}>{row.label}</a> : row.label}
                    </th>
                    <td className={styles.mono}>{row.value}</td>
                    <td>{row.detail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function ChartState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className={styles.chartState} role="status">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export function ChartLegend({ items }: { items: Array<{ label: string; tone: string }> }) {
  return (
    <ul className={styles.legendList} aria-label="Chart legend">
      {items.map((item) => (
        <li key={item.label}><i className={styles[item.tone]} aria-hidden="true" />{item.label}</li>
      ))}
    </ul>
  );
}
