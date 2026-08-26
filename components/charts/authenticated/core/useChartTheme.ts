'use client';

import { useEffect, useState } from 'react';

/*
 * Evidence Operations: charts are drawn from the interaction accent, observed-data
 * ink, and a neutral comparison ramp.
 * The semantic triplets are listed too, but only because a series may *encode*
 * success, warning, or critical — they are never categorical series colours.
 * The old numbered chart slots are deleted; do not reintroduce a positional
 * palette.
 */
const CHART_TOKENS = [
  '--uo-route-chart-primary',
  '--uo-route-chart-primary-soft',
  '--uo-route-chart-neutral-900',
  '--uo-route-chart-neutral-700',
  '--uo-route-chart-neutral-500',
  '--uo-route-chart-neutral-300',
  '--uo-route-chart-track',
  '--uo-route-chart-grid',
  '--uo-route-chart-ramp-1',
  '--uo-route-chart-ramp-2',
  '--uo-route-chart-ramp-3',
  '--uo-route-chart-ramp-4',
  '--uo-route-data-petrol',
  '--uo-route-success',
  '--uo-route-warning',
  '--uo-route-critical',
  '--uo-route-info',
  '--uo-route-text-primary',
  '--uo-route-text-secondary',
  '--uo-route-text-tertiary',
  '--uo-route-border-strong',
  '--uo-route-border-subtle',
  '--uo-route-border-default',
  '--uo-route-surface-primary',
  '--uo-route-icon-secondary',
  // VP2 §14.4 — outcome axis. The only tokens permitted to encode one of the
  // five canonical outcomes (§15.1) in a chart.
  '--uo-route-outcome-prevented',
  '--uo-route-outcome-recovered',
  '--uo-route-outcome-realised',
  '--uo-route-outcome-open',
  '--uo-route-outcome-identified',
  // VP2 §14.7 — cause axis. A monochrome ramp off the parent outcome; never
  // an independent hue per cause.
  '--uo-route-cause-1',
  '--uo-route-cause-2',
  '--uo-route-cause-3',
  '--uo-route-cause-4',
  '--uo-route-cause-5',
  '--uo-route-cause-other',
  // VP2 §14.8 — analytical axis + chart furniture. Distinction between
  // actual/comparison/forecast/reference is carried by stroke pattern
  // (§18.4), not by hue alone.
  '--uo-route-analytical-actual',
  '--uo-route-analytical-actual-soft',
  '--uo-route-analytical-secondary',
  '--uo-route-analytical-comparison',
  '--uo-route-analytical-forecast',
  '--uo-route-analytical-reference',
  '--uo-route-analytical-selected',
  '--uo-route-analytical-remainder',
  '--uo-route-analytical-stage-1',
  '--uo-route-analytical-stage-2',
  '--uo-route-analytical-stage-3',
  '--uo-route-analytical-stage-4',
  '--uo-route-chart-axis',
  '--uo-route-chart-zero',
  '--uo-route-chart-annotation',
] as const;

export type ChartTheme = Record<(typeof CHART_TOKENS)[number], string>;

function readTheme(): ChartTheme {
  if (typeof window === 'undefined') {
    return Object.fromEntries(CHART_TOKENS.map((token) => [token, ''])) as ChartTheme;
  }
  // --uo-route-chart-* tokens are scoped to .ua-app/.ua-auth-surface, not :root — resolve
  // against that element (falling back to <html> for isolated previews/tests).
  const scope = document.querySelector('.ua-app, .ua-auth-surface') ?? document.documentElement;
  const styles = getComputedStyle(scope);
  return Object.fromEntries(
    CHART_TOKENS.map((token) => [token, styles.getPropertyValue(token).trim()]),
  ) as ChartTheme;
}

/**
 * Resolves --uo-route-chart-* (and the handful of ink/border/status tokens Recharts needs)
 * to hex once per mount, and again whenever the authenticated theme root flips. Recharts components must
 * never hardcode a hex value or read the deleted --dashboard-* remap layer — this is
 * the bridge.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readTheme);

  useEffect(() => {
    setTheme(readTheme());
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-color-mode', 'data-mode'] });
    document.querySelectorAll<HTMLElement>('.uo-product[data-auth-theme]').forEach((themeRoot) => {
      observer.observe(themeRoot, { attributes: true, attributeFilter: ['data-auth-theme'] });
    });
    document.querySelectorAll<HTMLElement>('.ua-app').forEach((app) => {
      observer.observe(app, { attributes: true, attributeFilter: ['data-auth-theme', 'data-color-mode'] });
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
