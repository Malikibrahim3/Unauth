/**
 * The shared clock boundary (RUN-15).
 *
 * Production reads real time. Deterministic contexts — the Phase 1 QA fixture,
 * seed generation, and browser capture — pin an explicit `asOf` so that two
 * runs of the same fixture produce byte-identical dates and relative-time
 * labels. Without a single boundary, "3 days ago" is computed from whenever the
 * page happened to render, which makes a seeded page stale the moment it is
 * created and makes two captures of the same state differ.
 *
 * Everything that renders a date or an age must read time through here rather
 * than calling `Date.now()` directly.
 */

const AS_OF_ENV = 'UNAUTH_CLOCK_AS_OF';

let override: number | null = null;

declare global {
  // Installed before hydration by CaptureModeBootstrap. The leading
  // underscore keeps this test/capture-only boundary out of product APIs.
  var __UNAUTH_CAPTURE_NOW__: number | undefined;
}

function envAsOf(): number | null {
  const raw = typeof process !== 'undefined' ? process.env?.[AS_OF_ENV] : undefined;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function browserCaptureAsOf(): number | null {
  if (typeof globalThis === 'undefined') return null;
  const value = globalThis.__UNAUTH_CAPTURE_NOW__;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Epoch milliseconds for "now", honouring a pinned clock when one is set. */
export function nowMs(): number {
  if (override !== null) return override;
  const fromBrowserCapture = browserCaptureAsOf();
  if (fromBrowserCapture !== null) return fromBrowserCapture;
  const fromEnv = envAsOf();
  if (fromEnv !== null) return fromEnv;
  return Date.now();
}

/** `Date` for "now", honouring a pinned clock when one is set. */
export function now(): Date {
  return new Date(nowMs());
}

/** True when the clock is pinned rather than following real time. */
export function isClockPinned(): boolean {
  return override !== null || browserCaptureAsOf() !== null || envAsOf() !== null;
}

/**
 * Pins the clock. Intended for seed generation, capture runs and tests; a
 * production request path must never call this.
 */
export function setClock(asOf: string | number | Date): void {
  const parsed = asOf instanceof Date ? asOf.getTime() : typeof asOf === 'number' ? asOf : Date.parse(asOf);
  if (Number.isNaN(parsed)) throw new Error(`setClock received an unparseable value: ${String(asOf)}`);
  override = parsed;
}

/** Releases a pinned clock and returns to real time. */
export function resetClock(): void {
  override = null;
}
