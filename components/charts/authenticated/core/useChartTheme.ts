'use client';

/*
 * Evidence Operations: charts are drawn from the interaction accent, observed-data
 * ink, and a neutral comparison ramp.
 * The semantic triplets are listed too, but only because a series may *encode*
 * success, warning, or critical — they are never categorical series colours.
 * The old numbered chart slots are deleted; do not reintroduce a positional
 * palette.
 */
const CHART_TOKENS = [
  '--authority-chart-primary',
  '--authority-chart-primary-soft',
  '--authority-chart-neutral-900',
  '--authority-chart-neutral-700',
  '--authority-chart-neutral-500',
  '--authority-chart-neutral-300',
  '--authority-chart-track',
  '--authority-chart-grid',
  '--authority-chart-ramp-1',
  '--authority-chart-ramp-2',
  '--authority-chart-ramp-3',
  '--authority-chart-ramp-4',
  '--authority-data-petrol',
  '--authority-success',
  '--authority-warning',
  '--authority-critical',
  '--authority-info',
  '--authority-text-primary',
  '--authority-text-secondary',
  '--authority-text-tertiary',
  '--authority-border-strong',
  '--authority-border-subtle',
  '--authority-border-default',
  '--authority-surface-primary',
  '--authority-icon-secondary',
  // VP2 §14.4 — outcome axis. The only tokens permitted to encode one of the
  // five canonical outcomes (§15.1) in a chart.
  '--authority-outcome-prevented',
  '--authority-outcome-recovered',
  '--authority-outcome-realised',
  '--authority-outcome-open',
  '--authority-outcome-identified',
  // VP2 §14.7 — cause axis. A monochrome ramp off the parent outcome; never
  // an independent hue per cause.
  '--authority-cause-1',
  '--authority-cause-2',
  '--authority-cause-3',
  '--authority-cause-4',
  '--authority-cause-5',
  '--authority-cause-other',
  // VP2 §14.8 — analytical axis + chart furniture. Distinction between
  // actual/comparison/forecast/reference is carried by stroke pattern
  // (§18.4), not by hue alone.
  '--authority-analytical-actual',
  '--authority-analytical-actual-soft',
  '--authority-analytical-secondary',
  '--authority-analytical-comparison',
  '--authority-analytical-forecast',
  '--authority-analytical-reference',
  '--authority-analytical-selected',
  '--authority-analytical-remainder',
  '--authority-analytical-stage-1',
  '--authority-analytical-stage-2',
  '--authority-analytical-stage-3',
  '--authority-analytical-stage-4',
  '--authority-chart-axis',
  '--authority-chart-zero',
  '--authority-chart-annotation',
] as const;

export type ChartTheme = Record<(typeof CHART_TOKENS)[number], string>;

function colour(token: string): string {
  if (token.includes('surface-primary')) return '#fff';
  if (token.includes('border') || token.includes('grid') || token.includes('track') || token.includes('neutral-300')) return '#e4e3e0';
  if (token.includes('recovered') || token.includes('success')) return '#1a6b43';
  if (token.includes('realised') || token.includes('critical')) return '#b0431a';
  if (token.includes('warning') || token.includes('open')) return '#7a5310';
  if (token.includes('petrol') || token.includes('info') || token.includes('prevented')) return '#247388';
  if (token.includes('soft')) return '#e9e4de';
  if (token.includes('tertiary') || token.includes('neutral-500') || token.includes('comparison') || token.includes('forecast')) return '#6f6a63';
  if (token.includes('secondary') || token.includes('neutral-700') || token.includes('reference')) return '#64686d';
  if (token.includes('ramp-1') || token.includes('cause-1') || token.includes('stage-1')) return '#3c3935';
  if (token.includes('ramp-2') || token.includes('cause-2') || token.includes('stage-2')) return '#625e58';
  if (token.includes('ramp-3') || token.includes('cause-3') || token.includes('stage-3')) return '#6f6a63';
  if (token.includes('ramp-4') || token.includes('cause-4') || token.includes('stage-4')) return '#b7b1aa';
  return token.includes('primary') || token.includes('actual') ? '#9f4f08' : '#40454a';
}

const THEME = Object.fromEntries(CHART_TOKENS.map((token) => [token, colour(token)])) as ChartTheme;

/**
 * Resolves the static light token set once per mount. Recharts components must
 * never hardcode a hex value or read the deleted --dashboard-* remap layer.
 */
export function useChartTheme(): ChartTheme {
  return THEME;
}
