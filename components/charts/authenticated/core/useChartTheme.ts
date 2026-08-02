'use client';

import { useEffect, useState } from 'react';

/*
 * Instrument Grade: charts are drawn from the accent plus a neutral ramp.
 * The semantic triplets are listed too, but only because a series may *encode*
 * success, warning, or critical — they are never categorical series colours.
 * The old numbered chart slots are deleted; do not reintroduce a positional
 * palette.
 */
const CHART_TOKENS = [
  '--ua-chart-primary',
  '--ua-chart-primary-soft',
  '--ua-chart-neutral-900',
  '--ua-chart-neutral-700',
  '--ua-chart-neutral-500',
  '--ua-chart-neutral-300',
  '--ua-chart-track',
  '--ua-chart-grid',
  '--ua-chart-ramp-1',
  '--ua-chart-ramp-2',
  '--ua-chart-ramp-3',
  '--ua-chart-ramp-4',
  '--ua-success',
  '--ua-warning',
  '--ua-critical',
  '--ua-info',
  '--ua-text-primary',
  '--ua-text-secondary',
  '--ua-text-tertiary',
  '--ua-border-strong',
  '--ua-border-subtle',
  '--ua-border-default',
  '--ua-surface-primary',
  '--ua-icon-secondary',
] as const;

export type ChartTheme = Record<(typeof CHART_TOKENS)[number], string>;

function readTheme(): ChartTheme {
  if (typeof window === 'undefined') {
    return Object.fromEntries(CHART_TOKENS.map((token) => [token, ''])) as ChartTheme;
  }
  // --ua-chart-* tokens are scoped to .ua-app/.ua-auth-surface, not :root — resolve
  // against that element (falling back to <html> for isolated previews/tests).
  const scope = document.querySelector('.ua-app, .ua-auth-surface') ?? document.documentElement;
  const styles = getComputedStyle(scope);
  return Object.fromEntries(
    CHART_TOKENS.map((token) => [token, styles.getPropertyValue(token).trim()]),
  ) as ChartTheme;
}

/**
 * Resolves --ua-chart-* (and the handful of ink/border/status tokens Recharts needs)
 * to hex once per mount, and again whenever data-theme flips. Recharts components must
 * never hardcode a hex value or read the deleted --dashboard-* remap layer — this is
 * the bridge.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readTheme);

  useEffect(() => {
    setTheme(readTheme());
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
