import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/utils/env';

export const SUPPORT_INGEST_SECRET_HEADER = 'x-unauth-internal-secret';

export function resolveSupportIngestSecret(): string | null {
  return env.INTERNAL_SUPPORT_INGEST_SECRET ?? env.INTERNAL_HMAC_SECRET ?? null;
}

export function verifySupportIngestSecret(headerValue: string | null | undefined): boolean {
  const expected = resolveSupportIngestSecret();
  if (!expected || !headerValue) return false;

  const received = headerValue.trim();
  if (received.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}
