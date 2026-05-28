import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/utils/env';

/** Minimum entropy: 32 random bytes before encoding. */
export const GORGIAS_WEBHOOK_SECRET_MIN_BYTES = 32;

export const GORGIAS_WEBHOOK_SECRET_PREFIX = 'gorgias_whsec_';

/**
 * Pepper for webhook secret hashing.
 * Uses HMAC-SHA256(secret, pepper) so offline hash cracking requires the app pepper.
 * Falls back to IDENTITY_SALT when INTERNAL_HMAC_SECRET is unset (local dev only).
 */
function resolveGorgiasWebhookSecretPepper(): string {
  return env.INTERNAL_HMAC_SECRET ?? env.IDENTITY_SALT;
}

/** Cryptographically random webhook secret; display once to the merchant. */
export function generateGorgiasWebhookSecret(): string {
  const random = randomBytes(GORGIAS_WEBHOOK_SECRET_MIN_BYTES).toString('base64url');
  return `${GORGIAS_WEBHOOK_SECRET_PREFIX}${random}`;
}

/** One-way digest for storage. Never log or persist the plaintext. */
export function hashGorgiasWebhookSecret(secret: string): string {
  const pepper = resolveGorgiasWebhookSecretPepper();
  return createHmac('sha256', pepper).update(secret.trim(), 'utf8').digest('hex');
}

export function verifyGorgiasWebhookSecret(
  secret: string | null | undefined,
  storedHash: string | null | undefined
): boolean {
  if (!secret?.trim() || !storedHash?.trim()) return false;

  const computed = hashGorgiasWebhookSecret(secret);
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(storedHash.trim(), 'utf8');
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** True when the secret has at least 32 bytes of entropy after the optional prefix. */
export function isGorgiasWebhookSecretSufficientLength(secret: string): boolean {
  const trimmed = secret.trim();
  const body = trimmed.startsWith(GORGIAS_WEBHOOK_SECRET_PREFIX)
    ? trimmed.slice(GORGIAS_WEBHOOK_SECRET_PREFIX.length)
    : trimmed;
  // 32 bytes as base64url ≈ 43 chars; hex would be 64.
  return body.length >= 43;
}
