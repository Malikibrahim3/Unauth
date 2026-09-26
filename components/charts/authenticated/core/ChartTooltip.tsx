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
    <div role="status" style={{ minWidth: 150, display: 'grid', gap: 7, padding: '10px 11px', border: '1px solid #e4e3e0', borderRadius: 9, background: '#fff', boxShadow: '0 8px 24px rgba(28,22,14,.12)', color: '#1c1f23', fontSize: 11 }}>
      {value ? <span style={{ font: "600 14px/1.3 'IBM Plex Mono',monospace" }}>{value}</span> : null}
      {series?.length
        ? series.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '7px minmax(0,1fr) auto', gap: 7, alignItems: 'center' }}>
              <i style={{ width: 7, height: 7, borderRadius: '50%', background: row.colour }} aria-hidden="true" />
              <span>{row.label}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{row.value}</span>
            </div>
          ))
        : null}
      {caption ? <span style={{ color: '#6f6a63', fontSize: 10 }}>{caption}</span> : null}
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
