import type { Tier } from '@/lib/billing/tiers';
import { normalizeTier } from '@/lib/billing/normalizeTier';

export const DEV_TIER_COOKIE = 'unauth.dev.tier';

export type DevPreviewCookieValue = 'dev' | Tier | 'advanced';

export interface DevPreviewState {
  /** The tier being previewed. `enterprise` (top tier) when in dev/open mode. */
  tier: Tier;
  /** Whether product gates are being enforced in this preview session. */
  enforce: boolean;
}

/**
 * Parse a raw cookie value into a DevPreviewState.
 * - 'dev'       → open mode (enterprise tier, no enforcement)
 * - tier string → that tier with enforcement on
 * - anything else / absent → null (use env-var defaults)
 */
export function parseDevPreviewCookie(raw: string | undefined): DevPreviewState | null {
  if (!raw) return null;
  if (raw === 'dev') return { tier: 'enterprise', enforce: false };
  const tier = normalizeTier(raw);
  if (tier) return { tier, enforce: true };
  return null;
}

/** Safe to call in server components and API routes — import `cookies` from next/headers yourself. */
export function getDevPreviewFromCookieValue(cookieValue: string | undefined): DevPreviewState | null {
  return parseDevPreviewCookie(cookieValue);
}
