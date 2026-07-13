/**
 * ECharts colour palette and base option helpers for Unauth.
 * Uses the app's design token CSS variables (JS side).
 * Call readCssTokens() in a client component after mount.
 */

export type ThemeTokens = {
  /** Single action/emphasis token kept for existing chart wrappers. */
  accent: string;
  /** Grade/severity palette */
  sev_definite: string;
  sev_probable: string;
  sev_possible: string;
  sev_neutral: string;
  sev_weak: string;
  sev_clear: string;
  /** Neutral data series */
  data_neutral: string;
  /** Single emphasis series */
  ink_primary: string;
  /** Axis labels / annotations */
  ink_secondary: string;
  ink_tertiary: string;
  /** Surfaces */
  surface_raised: string;
  surface_border: string;
  surface_muted: string;
  /** Gauge gradient stops */
  gauge_from: string;
  gauge_mid: string;
  gauge_to: string;
};

/**
 * Fallback tokens (light theme).
 * Values are taken from the design token sheet and used only when
 * getComputedStyle is unavailable (SSR / test environments).
 */
export const LIGHT_TOKENS: ThemeTokens = {
  accent: 'var(--accent)',
  sev_definite: 'var(--success)',
  sev_probable: 'var(--warning)',
  sev_possible: 'var(--sev-possible)',
  sev_neutral: 'var(--sev-neutral)',
  sev_weak: 'var(--sev-neutral)',
  sev_clear: 'var(--neutral)',
  data_neutral: 'var(--neutral)',
  ink_primary: 'var(--text-primary)',
  ink_secondary: 'var(--text-secondary)',
  ink_tertiary: 'var(--text-tertiary)',
  surface_raised: 'var(--surface)',
  surface_border: 'var(--border)',
  surface_muted: 'var(--surface-sunken)',
  gauge_from: 'var(--gauge-from)',
  gauge_mid: 'var(--gauge-mid)',
  gauge_to: 'var(--gauge-to)',
};

export const DARK_TOKENS: ThemeTokens = {
  accent: 'var(--accent)',
  sev_definite: 'var(--success)',
  sev_probable: 'var(--warning)',
  sev_possible: 'var(--sev-possible)',
  sev_neutral: 'var(--sev-neutral)',
  sev_weak: 'var(--sev-neutral)',
  sev_clear: 'var(--neutral)',
  data_neutral: 'var(--neutral)',
  ink_primary: 'var(--text-primary)',
  ink_secondary: 'var(--text-secondary)',
  ink_tertiary: 'var(--text-tertiary)',
  surface_raised: 'var(--surface)',
  surface_border: 'var(--border)',
  surface_muted: 'var(--surface-sunken)',
  gauge_from: 'var(--gauge-from)',
  gauge_mid: 'var(--gauge-mid)',
  gauge_to: 'var(--gauge-to)',
};

/** Read live CSS variable values at runtime (client only). Falls back gracefully. */
export function readCssTokens(): ThemeTokens {
  if (typeof window === 'undefined') return LIGHT_TOKENS;
  // Authenticated tokens are deliberately scoped away from the public site.
  // Read from that scope when present so charts cannot fall back to landing
  // colours declared on :root.
  const tokenRoot = document.querySelector<HTMLElement>('.ua-app, .ua-auth-surface') ?? document.documentElement;
  const style = getComputedStyle(tokenRoot);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return {
    accent: get('--accent') || get('--text-primary') || LIGHT_TOKENS.accent,
    sev_definite: get('--sev-definite') || LIGHT_TOKENS.sev_definite,
    sev_probable: get('--sev-probable') || LIGHT_TOKENS.sev_probable,
    sev_possible: get('--sev-possible') || LIGHT_TOKENS.sev_possible,
    sev_neutral: get('--sev-neutral') || get('--sev-possible') || LIGHT_TOKENS.sev_neutral,
    sev_weak: get('--sev-weak') || get('--sev-neutral') || LIGHT_TOKENS.sev_weak,
    sev_clear: get('--sev-clear') || LIGHT_TOKENS.sev_clear,
    data_neutral: get('--data-neutral') || LIGHT_TOKENS.data_neutral,
    ink_primary: get('--text-primary') || LIGHT_TOKENS.ink_primary,
    ink_secondary: get('--text-secondary') || LIGHT_TOKENS.ink_secondary,
    ink_tertiary: get('--text-tertiary') || LIGHT_TOKENS.ink_tertiary,
    surface_raised: get('--surface-raised') || LIGHT_TOKENS.surface_raised,
    surface_border: get('--border-default') || get('--surface-border') || LIGHT_TOKENS.surface_border,
    surface_muted: get('--surface-muted') || LIGHT_TOKENS.surface_muted,
    gauge_from: get('--gauge-from') || LIGHT_TOKENS.gauge_from,
    gauge_mid: get('--gauge-mid') || LIGHT_TOKENS.gauge_mid,
    gauge_to: get('--gauge-to') || LIGHT_TOKENS.gauge_to,
  };
}

/**
 * Grade colour palette in severity order: definite → probable → possible → clear.
 * Use only for grade/risk/severity-segmented series.
 */
export function gradeColors(t: ThemeTokens) {
  return [t.sev_definite, t.sev_probable, t.sev_possible, t.sev_clear];
}

/** Base text/axis styling for all charts. */
export function baseAxisLabel(t: ThemeTokens) {
  return {
    color: t.ink_tertiary,
    fontFamily: 'inherit',
    fontSize: 11,
  };
}

export function baseSplitLine(t: ThemeTokens) {
  return {
    lineStyle: { color: t.surface_border, type: 'dashed' as const, width: 1 },
  };
}

export function baseTooltip(t: ThemeTokens) {
  return {
    backgroundColor: t.surface_raised,
    borderColor: t.surface_border,
    borderWidth: 1,
    textStyle: { color: t.ink_primary, fontSize: 12, fontFamily: 'inherit' },
    extraCssText: 'box-shadow: var(--shadow-md); border-radius: var(--radius-md);',
  };
}

/**
 * Gauge gradient stops for risk score gauges.
 * Returns an array suitable for ECharts color stops.
 */
export function gaugeGradientStops(t: ThemeTokens) {
  return [
    { offset: 0, color: t.gauge_from },
    { offset: 0.5, color: t.gauge_mid },
    { offset: 1, color: t.gauge_to },
  ];
}
