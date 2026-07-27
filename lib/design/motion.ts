/**
 * The single JavaScript mirror of the Living Precision motion contract (§7.1).
 *
 * CSS is the primary home for these values — `--ua-duration-*` and `--ua-ease-*`
 * in styles/authenticated/tokens.css. This module exists only for the call sites
 * that genuinely need a number in JS: timers, delayed indicators, and any
 * animation library configuration.
 *
 * Route call sites must not choose their own timing. If a value you need is not
 * here, add it here with its §7 justification rather than inlining a literal.
 */

/** §7.1 duration tokens, in milliseconds. */
export const DURATION = {
  /** Reduced motion, and state changes that must be immediate. */
  instant: 0,
  /** Press acknowledgement. */
  press: 80,
  /** Hover, tooltip, exit. */
  fast: 100,
  /** Selection, modal, toast, crossfade. */
  base: 160,
  /** Drawer and route settle. */
  slow: 220,
  /** One initial primary-chart reveal. */
  data: 360,
  /** One-shot changed-data wash. */
  highlight: 700,
  /** Real active work. */
  spinner: 800,
  /** Low-amplitude loading breath. */
  skeleton: 1_600,
  /** Verified live heartbeat only. */
  live: 2_400,
} as const;

/** §7.1 easing tokens. */
export const EASE = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Rotational spinner and indeterminate progress only. */
  linear: 'linear',
} as const;

/**
 * §7.1 timing thresholds. These are deliberately *delays before showing*
 * feedback: a fast interaction should show no loading affordance at all.
 */
export const DELAY = {
  /** Below this, a navigation shows no progress line. */
  routeProgress: 120,
  /** Below this, an async action shows no spinner. */
  pendingIndicator: 150,
  /** Below this, a resource shows no skeleton. */
  skeleton: 180,
  /** An optimistic toggle only admits to saving after this. */
  optimisticSaving: 400,
  /** After this, an explanatory slow-load/retry state appears. */
  slowLoadNotice: 8_000,
} as const;

/**
 * §7.3 route-progress curve. Progress is never a fake completion: the bar
 * enters at 12%, eases toward 65% and then 82%, and only actual navigation
 * completion takes it to 100%.
 */
export const ROUTE_PROGRESS = {
  enterPercent: 12,
  firstPercent: 65,
  firstAtMs: 600,
  secondPercent: 82,
  secondAtMs: 1_800,
  holdMs: 80,
  fadeMs: DURATION.fast,
} as const;

/** §7.3 toast lifetimes. Danger toasts persist until dismissed. */
export const TOAST_TIMEOUT = {
  titleOnly: 5_000,
  withDescription: 8_000,
  danger: null,
} as const;

/** True when the user has asked for reduced motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
