import type { Tier } from '@/lib/billing/tiers';

const TIER_SET = new Set<string>(['free', 'pro', 'growth', 'enterprise']);

/**
 * Legacy / plan-layer strings → canonical billing tier.
 * `scale` is retained as the internal PlanId for the top paid plan (matches the
 * `plans` table + Stripe products), but the Tier model was simplified to 4 —
 * so a `scale` plan resolves to the `enterprise` tier for gating and display.
 */
const LEGACY_TIER_MAP: Record<string, Tier> = {
  advanced: 'growth',
  scale: 'enterprise',
};

/**
 * Coerce a stored or cookie tier value to a canonical {@link Tier}.
 * Unknown values fall back to `free` (pricing ratchet: default low).
 */
export function normalizeTier(value: string | null | undefined): Tier {
  if (!value) return 'free';
  const mapped = LEGACY_TIER_MAP[value] ?? value;
  if (TIER_SET.has(mapped)) return mapped as Tier;
  return 'free';
}
