interface OnboardingGateInput {
  hasMerchantContext: boolean;
  setupComplete?: boolean | null;
  auditRunCount?: number | null;
  shopifyConnected: boolean;
  helpdeskConnected: boolean;
}

/**
 * App access requires a merchant context and an order source. Helpdesk setup is
 * optional: merchants must be able to enter the app to connect carriers,
 * warehouses, documents, or a different support provider without a healthy
 * Gorgias connection.
 */
export function shouldRequireOnboarding({
  hasMerchantContext,
  setupComplete,
  auditRunCount,
  shopifyConnected,
  helpdeskConnected: _helpdeskConnected,
}: OnboardingGateInput): boolean {
  if (!hasMerchantContext) return true;
  if (!shopifyConnected) return true;
  if (setupComplete === true) return false;
  return (auditRunCount ?? 0) === 0;
}
