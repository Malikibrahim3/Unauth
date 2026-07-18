'use client';

import { useEffect, useState } from 'react';

const CHART_TOKENS = [
  '--ua-chart-orange',
  '--ua-chart-blue',
  '--ua-chart-green',
  '--ua-chart-yellow',
  '--ua-chart-red',
  '--ua-chart-violet',
  '--ua-chart-neutral',
  '--ua-chart-track',
  '--ua-chart-grid',
  '--ua-chart-ramp-orange-1',
  '--ua-chart-ramp-orange-2',
  '--ua-chart-ramp-orange-3',
  '--ua-chart-ramp-orange-4',
  '--ua-chart-ramp-blue-1',
  '--ua-chart-ramp-blue-2',
  '--ua-chart-ramp-blue-3',
  '--ua-chart-ramp-blue-4',
  '--text-primary',
  '--text-secondary',
  '--text-tertiary',
  '--border-strong',
  '--border-muted',
  '--border-default',
  '--surface',
  '--surface-overlay',
  '--icon-muted',
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
 * Resolves --ua-chart-* (and the handful of ink/border tokens Recharts needs) to hex
 * once per mount, and again whenever data-theme flips. Recharts components must never
 * hardcode a hex value or read the deleted --dashboard-* remap layer — this is the bridge.
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
