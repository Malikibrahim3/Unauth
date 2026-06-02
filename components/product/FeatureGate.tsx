'use client';

import type { ReactNode } from 'react';
import { hasEntitlement, type Entitlement } from '@/lib/product/entitlements';
import { parseProductGateEnv } from '@/lib/product/envFlags';
import type { ProductTier } from '@/lib/product/tiers';
import { FeatureTierBadge } from '@/components/product/FeatureTierBadge';
import { LockedFeaturePreview } from '@/components/product/LockedFeaturePreview';
import { UpgradeCard } from '@/components/product/UpgradeCard';

function clientShouldEnforceProductGates(): boolean {
  return parseProductGateEnv(process.env.NEXT_PUBLIC_ENFORCE_PRODUCT_GATES);
}

export function FeatureGate({
  entitlement,
  plan,
  children,
  showTierBadge = true,
}: {
  entitlement: Entitlement;
  plan: ProductTier;
  children: ReactNode;
  showTierBadge?: boolean;
}) {
  const enforce = clientShouldEnforceProductGates();
  const allowed = hasEntitlement(plan, entitlement);

  if (!enforce) {
    return (
      <div className="relative">
        {showTierBadge ? (
          <div className="absolute right-0 top-0 z-10 -translate-y-1/2">
            <FeatureTierBadge entitlement={entitlement} />
          </div>
        ) : null}
        {children}
      </div>
    );
  }

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <UpgradeCard entitlement={entitlement} />
      <LockedFeaturePreview>{children}</LockedFeaturePreview>
    </div>
  );
}
