/*
 * Living Precision §6.2 / §6.8 — the minimum shared chart *contract*.
 *
 * This is the pure, framework-free half of the Phase 06 chart primitive set:
 * the series-role → token mapping every chart must obey, and the aggregation
 * guards that make an invalid chart fail loudly rather than draw a plausible
 * lie. The React frame (`ChartFrame`/`ChartState`/`ChartDataTable`) reads role
 * styles from here; route selectors feed their aggregates through the guards.
 *
 * Nothing here reads a hue directly. A series is assigned a *role*; the role
 * resolves to a `--ua-chart-*`/semantic token. A recolour can never silently
 * change the meaning a chart is carrying, and a semantic hue can only enter a
 * chart through an explicit semantic role — never as the fourth categorical
 * colour in a rainbow.
 */

/** §6.2 series roles. Analytical roles read the accent/neutral ramp; the three
 * semantic roles read the status triplets and exist ONLY for a value that
 * itself encodes success, warning, or critical. `baseline` is a track/context
 * value and is never a meaningful discrete mark. */
export type ChartSeriesRole =
  | 'current' // accent, solid — current/selected/primary series
  | 'related' // accent tint — related secondary / composition series
  | 'comparison' // neutral, dashed — prior period
  | 'strong' // neutral-900 — strong comparison
  | 'secondary' // neutral-700 — secondary comparison
  | 'tertiary' // neutral-500 — tertiary series
  | 'baseline' // neutral-300 — baseline/track/context only
  | 'success'
  | 'warning'
  | 'critical';

export type SeriesMeaning = 'analytical' | 'baseline' | 'semantic';

export type ResolvedSeriesStyle = {
  role: ChartSeriesRole;
  /** CSS custom-property reference for this role's stroke/fill. */
  colorVar: string;
  /** Comparison series combine colour with a dash so the encoding survives
   * forced-colour mode and greyscale print (§6.2). */
  dashed: boolean;
  meaning: SeriesMeaning;
  /** A meaningful discrete mark must clear 3:1 against the plot. `baseline`
   * cannot, by design, so it is never allowed to be the only key for a
   * meaningful series. */
  meaningfulMarkAllowed: boolean;
};

const ROLE_STYLE: Record<ChartSeriesRole, Omit<ResolvedSeriesStyle, 'role'>> = {
  current: { colorVar: 'var(--ua-chart-primary)', dashed: false, meaning: 'analytical', meaningfulMarkAllowed: true },
  related: { colorVar: 'var(--ua-chart-primary-soft)', dashed: false, meaning: 'analytical', meaningfulMarkAllowed: true },
  comparison: { colorVar: 'var(--ua-chart-neutral-500)', dashed: true, meaning: 'analytical', meaningfulMarkAllowed: true },
  strong: { colorVar: 'var(--ua-chart-neutral-900)', dashed: false, meaning: 'analytical', meaningfulMarkAllowed: true },
  secondary: { colorVar: 'var(--ua-chart-neutral-700)', dashed: false, meaning: 'analytical', meaningfulMarkAllowed: true },
  tertiary: { colorVar: 'var(--ua-chart-neutral-500)', dashed: false, meaning: 'analytical', meaningfulMarkAllowed: true },
  baseline: { colorVar: 'var(--ua-chart-neutral-300)', dashed: false, meaning: 'baseline', meaningfulMarkAllowed: false },
  success: { colorVar: 'var(--ua-success)', dashed: false, meaning: 'semantic', meaningfulMarkAllowed: true },
  warning: { colorVar: 'var(--ua-warning)', dashed: false, meaning: 'semantic', meaningfulMarkAllowed: true },
  critical: { colorVar: 'var(--ua-critical)', dashed: false, meaning: 'semantic', meaningfulMarkAllowed: true },
};

/** §6.2: no more than five simultaneous categories in one plot. */
export const MAX_SIMULTANEOUS_CATEGORIES = 5;

export class ChartContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChartContractError';
  }
}

export function resolveSeriesRole(role: ChartSeriesRole): ResolvedSeriesStyle {
  return { role, ...ROLE_STYLE[role] };
}

/**
 * Enforce the §6.2 role rules for a set of series drawn together:
 *  - at most five simultaneous *analytical* categories (semantic/baseline
 *    marks do not count toward the categorical budget);
 *  - a role marked as a meaningful discrete mark must clear the 3:1 contrast
 *    contract, so `baseline` can never be the encoding for a meaningful series.
 *
 * Returns the resolved styles in the same order; throws `ChartContractError`
 * when the set is invalid.
 */
export function resolveSeriesSet(
  series: Array<{ role: ChartSeriesRole; meaningful?: boolean }>,
): ResolvedSeriesStyle[] {
  const analyticalCategories = series.filter((s) => resolveSeriesRole(s.role).meaning === 'analytical').length;
  if (analyticalCategories > MAX_SIMULTANEOUS_CATEGORIES) {
    throw new ChartContractError(
      `chart declares ${analyticalCategories} simultaneous analytical series; ${MAX_SIMULTANEOUS_CATEGORIES} is the maximum (use ranked bars, small multiples, or a table)`,
    );
  }
  return series.map((s) => {
    const resolved = resolveSeriesRole(s.role);
    if (s.meaningful && !resolved.meaningfulMarkAllowed) {
      throw new ChartContractError(
        `role "${s.role}" is a baseline/context value and cannot encode a meaningful mark; use a graphic colour with ≥3:1 contrast`,
      );
    }
    return resolved;
  });
}

/* ─────────────────────────── Aggregation guards (LP-VIZ-08) ─────────────────────────── */

/** §6.6: null, zero, and unavailable stay distinct. `unavailable` is a missing
 * measurement; `zero` is a real measured absence of value. */
export type DatumClass = 'unavailable' | 'zero' | 'value';

export function classifyValue(value: number | null | undefined): DatumClass {
  if (value == null || !Number.isFinite(value)) return 'unavailable';
  return value === 0 ? 'zero' : 'value';
}

export type RateBucket = { numerator: number; denominator: number };

/**
 * §6.8: "A rate requires an explicit numerator and denominator; never average
 * pre-aggregated percentages." The only sanctioned way to build a rate over
 * several buckets is to sum the raw numerators and denominators — which is what
 * this does. Feeding it counts (not percentages) is structural: a non-finite or
 * negative count throws rather than silently skewing the result.
 *
 * Returns `null` when the denominator is zero (an undefined rate is not `0`).
 */
export function computeRateFromBuckets(buckets: RateBucket[]): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const bucket of buckets) {
    if (!Number.isFinite(bucket.numerator) || !Number.isFinite(bucket.denominator)) {
      throw new ChartContractError('rate bucket carries a non-finite count; a rate is built from raw counts, not pre-aggregated percentages');
    }
    if (bucket.numerator < 0 || bucket.denominator < 0) {
      throw new ChartContractError('rate bucket carries a negative count');
    }
    if (bucket.numerator > bucket.denominator) {
      throw new ChartContractError('rate numerator exceeds its denominator');
    }
    numerator += bucket.numerator;
    denominator += bucket.denominator;
  }
  return denominator <= 0 ? null : numerator / denominator;
}

/** Single-bucket convenience over {@link computeRateFromBuckets}. */
export function computeRate(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null) return null;
  return computeRateFromBuckets([{ numerator, denominator }]);
}

export type WaterfallStep = { key: string; label: string; value: number };

/**
 * §6.8: "A waterfall renders only when every component reconciles to the
 * displayed total within currency rounding." Tolerance defaults to one minor
 * unit (a single penny/cent of rounding), not a percentage.
 */
export function reconcilesToTotal(steps: WaterfallStep[], total: number, toleranceMinor = 1): boolean {
  const sum = steps.reduce((running, step) => running + step.value, 0);
  return Math.abs(sum - total) <= toleranceMinor;
}

export function assertWaterfallReconciles(steps: WaterfallStep[], total: number, toleranceMinor = 1): void {
  if (!reconcilesToTotal(steps, total, toleranceMinor)) {
    const sum = steps.reduce((running, step) => running + step.value, 0);
    throw new ChartContractError(
      `waterfall components sum to ${sum} but the displayed total is ${total} (tolerance ${toleranceMinor}); do not render an unreconciled waterfall`,
    );
  }
}

/** §6.8: mixed currency is split or blocked, never silently combined. */
export function distinctCurrencies(rows: Array<{ currency: string | null | undefined }>): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.currency) seen.add(row.currency);
  }
  return [...seen];
}

/**
 * Returns the single currency shared by every row, or throws — the caller then
 * either splits the dataset by currency or renders the mixed-currency state.
 */
export function assertSingleCurrency(rows: Array<{ currency: string | null | undefined }>): string {
  const currencies = distinctCurrencies(rows);
  if (currencies.length === 0) {
    throw new ChartContractError('no currency present; a monetary chart cannot aggregate currency-free rows');
  }
  if (currencies.length > 1) {
    throw new ChartContractError(`mixed currency (${currencies.join(', ')}); split by currency or block aggregation — never combine`);
  }
  return currencies[0];
}

/* ─────────────────────────── Minimum data (§6.8) ─────────────────────────── */

export const MIN_TREND_POINTS = 3;
export const MIN_COMPARISON_POINTS = 7;

export function truthfulPointCount(points: Array<number | null | undefined>): number {
  return points.reduce<number>((count, point) => (classifyValue(point) === 'unavailable' ? count : count + 1), 0);
}

/** A time trend needs at least three truthful points to render geometry. */
export function canRenderTrend(points: Array<number | null | undefined>): boolean {
  return truthfulPointCount(points) >= MIN_TREND_POINTS;
}

/** A period comparison needs at least seven truthful points. */
export function canRenderComparison(points: Array<number | null | undefined>): boolean {
  return truthfulPointCount(points) >= MIN_COMPARISON_POINTS;
}
