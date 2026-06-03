import { TIER_CONFIG, type Tier } from '@/lib/billing/tiers';

/**
 * @deprecated Import {@link Tier} from `@/lib/billing/tiers` instead.
 * `ProductTier` is retained for incremental migration of call sites.
 */
export type { Tier as ProductTier } from '@/lib/billing/tiers';
export { TIER_CONFIG, TIER_ORDER, tierLabel, type Tier } from '@/lib/billing/tiers';

export const TIER_LABELS: Record<Tier, string> = {
  free: TIER_CONFIG.free.label,
  pro: TIER_CONFIG.pro.label,
  growth: TIER_CONFIG.growth.label,
  scale: TIER_CONFIG.scale.label,
  enterprise: TIER_CONFIG.enterprise.label,
};
