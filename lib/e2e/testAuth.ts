/**
 * Local/test-only auth helpers for E2E merchant surface verification.
 * Never enabled on production deploys.
 */

function allowedMerchantIds(): Set<string> {
  const configured = [
    process.env.E2E_MERCHANT_ID,
    ...(process.env.E2E_ALLOWED_MERCHANT_IDS?.split(',') ?? []),
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return new Set(configured);
}

export function isE2eTestAuthEnabled(): boolean {
  // This route mints a full OWNER session from a single static secret. It must
  // NEVER be reachable on a deployed environment — preview deploys can carry
  // real tenant data, so gating on `production` alone was insufficient. Enable
  // only in local development (VERCEL_ENV unset or 'development').
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production' || vercelEnv === 'preview') return false;
  if (!process.env.E2E_AUTH_SECRET?.trim()) return false;
  return true;
}

export function validateE2eAuthSecret(secret: string | null | undefined): boolean {
  const expected = process.env.E2E_AUTH_SECRET?.trim();
  if (!expected || !secret?.trim()) return false;
  return secret.trim() === expected;
}

export function validateE2eMerchantId(merchantId: string | null | undefined): boolean {
  if (!merchantId?.trim()) return false;
  return allowedMerchantIds().has(merchantId.trim());
}

export function validateE2eAuthRequest(input: {
  secret: string | null | undefined;
  merchantId: string | null | undefined;
}): boolean {
  if (!isE2eTestAuthEnabled()) return false;
  return validateE2eAuthSecret(input.secret) && validateE2eMerchantId(input.merchantId);
}
