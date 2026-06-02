import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/utils/env';

export const FRESHDESK_WEBHOOK_SECRET_MIN_BYTES = 32;

export const FRESHDESK_WEBHOOK_SECRET_PREFIX = 'freshdesk_whsec_';

function resolveFreshdeskWebhookSecretPepper(): string {
  return env.INTERNAL_HMAC_SECRET ?? env.IDENTITY_SALT;
}

export function generateFreshdeskWebhookSecret(): string {
  const random = randomBytes(FRESHDESK_WEBHOOK_SECRET_MIN_BYTES).toString('base64url');
  return `${FRESHDESK_WEBHOOK_SECRET_PREFIX}${random}`;
}

export function hashFreshdeskWebhookSecret(secret: string): string {
  const pepper = resolveFreshdeskWebhookSecretPepper();
  return createHmac('sha256', pepper).update(secret.trim(), 'utf8').digest('hex');
}

export function verifyFreshdeskWebhookSecret(
  secret: string | null | undefined,
  storedHash: string | null | undefined
): boolean {
  if (!secret?.trim() || !storedHash?.trim()) return false;

  const computed = hashFreshdeskWebhookSecret(secret);
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(storedHash.trim(), 'utf8');
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isFreshdeskWebhookSecretSufficientLength(secret: string): boolean {
  const trimmed = secret.trim();
  const body = trimmed.startsWith(FRESHDESK_WEBHOOK_SECRET_PREFIX)
    ? trimmed.slice(FRESHDESK_WEBHOOK_SECRET_PREFIX.length)
    : trimmed;
  return body.length >= 43;
}
