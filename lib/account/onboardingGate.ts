interface OnboardingGateInput {
  hasMerchantContext: boolean;
  setupComplete?: boolean | null;
  auditRunCount?: number | null;
}

export function shouldRequireOnboarding({
  hasMerchantContext,
  setupComplete,
  auditRunCount,
}: OnboardingGateInput): boolean {
  if (!hasMerchantContext) return true;
  if (setupComplete === true) return false;
  return (auditRunCount ?? 0) === 0;
}
