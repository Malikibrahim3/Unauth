export type ProductTier = 'free' | 'pro' | 'advanced' | 'enterprise';

export const TIER_ORDER: Record<ProductTier, number> = {
  free: 0,
  pro: 1,
  advanced: 2,
  enterprise: 3,
};

export const TIER_LABELS: Record<ProductTier, string> = {
  free: 'Free',
  pro: 'Pro',
  advanced: 'Advanced',
  enterprise: 'Enterprise',
};
