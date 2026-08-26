interface OnboardingGateInput {
  hasMerchantContext: boolean;
  profileComplete?: boolean | null;
  onboardingDeferred?: boolean | null;
  setupComplete?: boolean | null;
  auditRunCount?: number | null;
  shopifyConnected: boolean;
  helpdeskConnected: boolean;
}

/**
 * App access requires a merchant context and a completed profile (or retained
 * audit history). Connector choice is intentionally not a gate: merchants
 * must be able to enter Integrations and choose Shopify, ShipBob, a carrier,
 * documents, or another supported source as their first connection.
 */
export function shouldRequireOnboarding({
  hasMerchantContext,
  profileComplete,
  onboardingDeferred,
  setupComplete,
  auditRunCount,
  shopifyConnected: _shopifyConnected,
  helpdeskConnected: _helpdeskConnected,
}: OnboardingGateInput): boolean {
  if (!hasMerchantContext) return true;
  if (setupComplete === true) return false;
  if (onboardingDeferred === true) return false;
  if (profileComplete === true) return false;
  return (auditRunCount ?? 0) === 0;
}
