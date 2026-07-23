import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/utils/env';
import { verifyGorgiasWebhookSecret } from '@/lib/support/gorgias/webhookSecret';
import type { GorgiasSupportConnectionRow } from '@/lib/support/gorgias/resolveConnection';
import { isGorgiasProductionIngestMode } from '@/lib/support/gorgias/resolveMerchantId';

// Canonical definition lives in the client-safe shared module; re-exported here
// for existing server-side importers.
export { GORGIAS_SUPPORT_SECRET_HEADERS } from '@/lib/support/gorgias/supportConnectionShared';
import {
  GORGIAS_SUPPORT_SECRET_HEADERS,
} from '@/lib/support/gorgias/supportConnectionShared';

export function readGorgiasWebhookSecretHeader(
  headers: Headers | { get(name: string): string | null }
): string | null {
  for (const name of GORGIAS_SUPPORT_SECRET_HEADERS) {
    const value = headers.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function readGorgiasWebhookSecret(
  headers: Headers | { get(name: string): string | null },
): string | null {
  return readGorgiasWebhookSecretHeader(headers);
}

export function isGorgiasGlobalWebhookSecretAllowed(): boolean {
  return !isGorgiasProductionIngestMode() && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || env.VERCEL_ENV === 'development');
}

/** Dev/test fallback: compare header to global env secret (plaintext, timing-safe). */
export function verifyGlobalGorgiasSupportWebhookSecret(
  headerValue: string | null | undefined
): boolean {
  if (!isGorgiasGlobalWebhookSecretAllowed()) return false;

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

export type GorgiasWebhookAuthResult =
  | { ok: true; method: 'connection_hash' | 'global_fallback' }
  | { ok: false; status: 401 | 403; code: string };

export type VerifyGorgiasWebhookAuthInput = {
  headerSecret: string | null;
  connection: Pick<GorgiasSupportConnectionRow, 'webhook_secret_hash'> | null;
  hasResolvedConnection: boolean;
};

export function verifyGorgiasWebhookAuth(
  input: VerifyGorgiasWebhookAuthInput
): GorgiasWebhookAuthResult {
  const { headerSecret, connection, hasResolvedConnection } = input;
  const storedHash = connection?.webhook_secret_hash ?? null;

  if (storedHash) {
    if (!headerSecret) {
      return { ok: false, status: 401, code: 'unauthorized' };
    }
    if (verifyGorgiasWebhookSecret(headerSecret, storedHash)) {
      return { ok: true, method: 'connection_hash' };
    }
    return { ok: false, status: 401, code: 'unauthorized' };
  }

  if (hasResolvedConnection) {
    if (isGorgiasProductionIngestMode() && !isGorgiasGlobalWebhookSecretAllowed()) {
      return { ok: false, status: 403, code: 'gorgias_connection_secret_missing' };
    }
    if (verifyGlobalGorgiasSupportWebhookSecret(headerSecret)) {
      return { ok: true, method: 'global_fallback' };
    }
    return { ok: false, status: 401, code: 'unauthorized' };
  }

  if (verifyGlobalGorgiasSupportWebhookSecret(headerSecret)) {
    return { ok: true, method: 'global_fallback' };
  }

  return { ok: false, status: 401, code: 'unauthorized' };
}

/** @deprecated Use verifyGorgiasWebhookAuth with a resolved connection. */
export function verifyGorgiasSupportWebhookSecret(headerValue: string | null | undefined): boolean {
  return verifyGlobalGorgiasSupportWebhookSecret(headerValue);
}
