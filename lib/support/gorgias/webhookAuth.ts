import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/utils/env';

export const GORGIAS_SUPPORT_SECRET_HEADERS = [
  'x-unauth-gorgias-secret',
  'x-gorgias-webhook-secret',
] as const;

export function readGorgiasWebhookSecretHeader(
  headers: Headers | { get(name: string): string | null }
): string | null {
  for (const name of GORGIAS_SUPPORT_SECRET_HEADERS) {
    const value = headers.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function verifyGorgiasSupportWebhookSecret(headerValue: string | null | undefined): boolean {
  const expected = env.GORGIAS_SUPPORT_WEBHOOK_SECRET;
  if (!expected || !headerValue) return false;

  const received = headerValue.trim();
  if (received.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}
