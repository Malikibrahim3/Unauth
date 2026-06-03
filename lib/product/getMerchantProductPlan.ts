import { getMerchantTier } from '@/lib/billing/getMerchantTier';
import type { Tier } from '@/lib/billing/tiers';
import { createServiceClient } from '@/lib/supabase/server';

/** @deprecated Use {@link getMerchantTier} — returns canonical billing tier. */
export async function getMerchantProductPlan(merchantId: string): Promise<Tier> {
  const supabase = createServiceClient();
  return getMerchantTier(supabase, merchantId);
}
