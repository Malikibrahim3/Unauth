interface OnboardingGateInput {
  hasMerchantContext: boolean;
  setupComplete?: boolean | null;
  auditRunCount?: number | null;
  shopifyConnected: boolean;
  helpdeskConnected: boolean;
}

/**
 * Dashboard access requires both an order source (Shopify) and a helpdesk
 * (Gorgias, or another linked provider) connected — the claim gate can't
 * assemble evidence or surface a widget without them. Profile completion
 * alone no longer satisfies onboarding.
 */
export function shouldRequireOnboarding({
  hasMerchantContext,
  setupComplete,
  auditRunCount,
  shopifyConnected,
  helpdeskConnected,
}: OnboardingGateInput): boolean {
  if (!hasMerchantContext) return true;
  if (!shopifyConnected || !helpdeskConnected) return true;
  if (setupComplete === true) return false;
  return (auditRunCount ?? 0) === 0;
}
