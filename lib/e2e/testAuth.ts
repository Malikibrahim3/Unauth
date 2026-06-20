/**
 * Local/test-only auth helpers for E2E merchant surface verification.
 * Never enabled on production deploys.
 */

/** Canonical E2E Shopify + Gorgias merchant used by acceptance scripts. */
export const E2E_MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';

const ALLOWED_MERCHANT_IDS = new Set([E2E_MERCHANT_ID]);

export function isE2eTestAuthEnabled(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false;
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
  return ALLOWED_MERCHANT_IDS.has(merchantId.trim());
}

export function validateE2eAuthRequest(input: {
  secret: string | null | undefined;
  merchantId: string | null | undefined;
}): boolean {
  if (!isE2eTestAuthEnabled()) return false;
  return validateE2eAuthSecret(input.secret) && validateE2eMerchantId(input.merchantId);
}
