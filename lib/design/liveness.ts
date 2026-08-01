/**
 * §7.4's freshness and "live" grammar as plain data — transport, activity,
 * freshness, and live are independent axes; no route should collapse them
 * into one another (a merely `connected` transport is not `success`, and a
 * webhook credential or manual refresh is never labelled "Live").
 */

/** Static; transport alone carries no success/failure meaning (information only). */
export type TransportState = 'connected' | 'offline';

/** A spinner is warranted only for `updating`/`syncing`. */
export type ActivityState = 'idle' | 'updating' | 'syncing' | 'failed';

/** Static semantic treatment — never animated. */
export type FreshnessState = 'current' | 'stale' | 'unknown';

/**
 * A Live input requires a verified active subscription plus a domain-owned
 * `heartbeatExpiresAt` — the UI never invents a universal heartbeat timeout.
 */
export interface LiveHeartbeat {
  heartbeatExpiresAt: string;
}

export function isLive(heartbeat: LiveHeartbeat | null | undefined, nowMs: number): boolean {
  if (!heartbeat) return false;
  const expires = Date.parse(heartbeat.heartbeatExpiresAt);
  return Number.isFinite(expires) && nowMs < expires;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * §7.4 recency copy: "Updated just now" below 60s, then minute granularity.
 * Callers re-render this at most once per minute — the string itself does
 * not animate or count up.
 */
export function formatRecency(timestampIso: string | null | undefined, nowMs: number): string {
  if (!timestampIso) return 'Unknown';
  const then = Date.parse(timestampIso);
  if (Number.isNaN(then)) return 'Unknown';
  const diffMs = Math.max(0, nowMs - then);

  if (diffMs < MINUTE_MS) return 'Updated just now';

  const minutes = Math.floor(diffMs / MINUTE_MS);
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(diffMs / HOUR_MS);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(diffMs / DAY_MS);
  return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
}

/** §7.4 "As of …" copy for snapshot (non-live) data. */
export function formatAsOf(timestampIso: string | null | undefined): string {
  if (!timestampIso) return 'As of an unknown time';
  const then = new Date(timestampIso);
  if (Number.isNaN(then.getTime())) return 'As of an unknown time';
  return `As of ${then.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
}

/** Full absolute description for the `aria-describedby` pairing in §7.4. */
export function formatAbsolute(timestampIso: string | null | undefined): string {
  if (!timestampIso) return 'Time unknown';
  const then = new Date(timestampIso);
  if (Number.isNaN(then.getTime())) return 'Time unknown';
  return then.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
}
