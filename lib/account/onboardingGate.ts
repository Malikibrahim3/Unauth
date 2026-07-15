interface OnboardingGateInput {
  hasMerchantContext: boolean;
  setupComplete?: boolean | null;
  auditRunCount?: number | null;
  shopifyConnected: boolean;
  helpdeskConnected: boolean;
}

/**
 * Connections improve coverage, but they are optional during signup. A user
 * can finish their profile and enter the app in a limited/no-source state,
 * then connect one provider from each category later.
 */
export function shouldRequireOnboarding({
  hasMerchantContext,
  setupComplete,
  auditRunCount,
  shopifyConnected: _shopifyConnected,
  helpdeskConnected: _helpdeskConnected,
}: OnboardingGateInput): boolean {
  if (!hasMerchantContext) return true;
  if (setupComplete === true) return false;
  return (auditRunCount ?? 0) === 0;
}
