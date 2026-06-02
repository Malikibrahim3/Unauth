import type { ProductTier } from '@/lib/product/tiers';

// TODO(product-gating): replace with database/billing-backed plan lookup.
// Phase 0: every merchant gets 'enterprise' so the full app stays testable in dev.
export async function getMerchantProductPlan(_merchantId: string): Promise<ProductTier> {
  return 'enterprise';
}
