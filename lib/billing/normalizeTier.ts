import type { Tier } from '@/lib/billing/tiers';

const TIER_SET = new Set<string>(['free', 'pro', 'growth', 'scale', 'enterprise']);

/** Legacy product tier strings → canonical billing tier. */
const LEGACY_TIER_MAP: Record<string, Tier> = {
  advanced: 'growth',
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
