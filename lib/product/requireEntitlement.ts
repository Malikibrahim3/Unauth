import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMerchantTier } from '@/lib/billing/getMerchantTier';
import {
  getRequiredTierForEntitlement,
  hasEntitlement,
  type Entitlement,
} from '@/lib/product/entitlements';
import { shouldEnforceProductGates } from '@/lib/product/gates';

/**
 * Server-side product-gate guard for API routes.
 *
 * Returns a 403 NextResponse when product gates are enforced
 * (`ENFORCE_PRODUCT_GATES`) and the merchant's tier lacks `entitlement`;
 * otherwise returns null and the caller proceeds. When gates are disabled
 * (the default in dev/preview) this is a no-op, so wiring it in does not change
 * current behaviour until the flag is turned on.
 */
export async function enforceEntitlement(
  client: SupabaseClient,
  merchantId: string,
  entitlement: Entitlement,
): Promise<NextResponse | null> {
  if (!shouldEnforceProductGates()) return null;
  const tier = await getMerchantTier(client, merchantId);
  if (hasEntitlement(tier, entitlement)) return null;
  return NextResponse.json(
    {
      error: 'plan_upgrade_required',
      entitlement,
      required_tier: getRequiredTierForEntitlement(entitlement),
    },
    { status: 403 },
  );
}
