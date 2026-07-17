import type { ReactNode } from 'react';
import type { AuthChartTableRow } from './types';
import styles from './AuthenticatedCharts.module.css';

type ChartPanelProps = {
  id: string;
  title: string;
  description?: string;
  annotation?: ReactNode;
  legend?: ReactNode;
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
      {legend ? <div className={styles.legend}>{legend}</div> : null}
      <div className={compact ? styles.compactPlot : styles.plot}>{children}</div>
      {table.length > 0 ? (
        <details className={styles.dataDetails}>
          <summary>View chart data</summary>
          <div className={styles.dataTableWrap}>
            <table>
              <thead><tr><th scope="col">Item</th><th scope="col">Value</th><th scope="col">Context</th></tr></thead>
              <tbody>
                {table.map((row) => (
                  <tr key={`${row.label}-${row.detail ?? ''}`}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
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
