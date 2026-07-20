import styles from '../AuthenticatedCharts.module.css';

export type ChartTooltipSeriesRow = {
  label: string;
  value: string;
  colour: string;
};

export type ChartTooltipProps = {
  /** Value-first per T10: the primary reading, 14px DM Mono 600. */
  value?: string;
  /** Period/context line, 11px tertiary. */
  caption?: string;
  /** Multi-series rows — one per series at this X, never only the hovered one. */
  series?: ChartTooltipSeriesRow[];
};

/** T10 tooltip card. Shared by Recharts `content` renderers and CSS-chart hover wrappers. */
export function ChartTooltip({ value, caption, series }: ChartTooltipProps) {
  return (
    <div className={styles.tooltipCard} role="status">
      {value ? <span className={styles.tooltipValue}>{value}</span> : null}
      {series?.length
        ? series.map((row) => (
            <div key={row.label} className={styles.tooltipSeriesRow}>
              <i style={{ background: row.colour }} aria-hidden="true" />
              <span>{row.label}</span>
              <span className={styles.mono}>{row.value}</span>
            </div>
          ))
        : null}
      {caption ? <span className={styles.tooltipCaption}>{caption}</span> : null}
    </div>
  );
}

/** Recharts-compatible tooltip content renderer — pass as the `content` prop on <Tooltip>. */
export function renderChartTooltip(
  formatPayload: (payload: unknown[], label: unknown) => ChartTooltipProps | null,
) {
  return function RechartsTooltipContent({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: unknown[];
    label?: unknown;
  }) {
    if (!active || !payload?.length) return null;
    const props = formatPayload(payload, label);
    if (!props) return null;
    return <ChartTooltip {...props} />;
  };
}
