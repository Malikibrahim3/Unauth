import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/utils/env';
import { verifyFreshdeskWebhookSecret } from '@/lib/support/freshdesk/webhookSecret';
import type { FreshdeskSupportConnectionRow } from '@/lib/support/freshdesk/resolveConnection';
import { isFreshdeskProductionIngestMode } from '@/lib/support/freshdesk/resolveMerchantId';

export { FRESHDESK_SUPPORT_SECRET_HEADERS } from '@/lib/support/freshdesk/supportConnectionShared';
import {
  FRESHDESK_SUPPORT_SECRET_HEADERS,
  FRESHDESK_WEBHOOK_SECRET_QUERY_PARAM,
} from '@/lib/support/freshdesk/supportConnectionShared';

export function readFreshdeskWebhookSecretHeader(
  headers: Headers | { get(name: string): string | null }
): string | null {
  for (const name of FRESHDESK_SUPPORT_SECRET_HEADERS) {
    const value = headers.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function readFreshdeskWebhookSecret(
  headers: Headers | { get(name: string): string | null },
  webhookSearchParams?: URLSearchParams | null
): string | null {
  const fromHeader = readFreshdeskWebhookSecretHeader(headers);
  if (fromHeader) return fromHeader;
  const fromQuery = webhookSearchParams?.get(FRESHDESK_WEBHOOK_SECRET_QUERY_PARAM)?.trim();
  return fromQuery || null;
}

export function isFreshdeskGlobalWebhookSecretAllowed(): boolean {
  return !isFreshdeskProductionIngestMode() && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || env.VERCEL_ENV === 'development');
}

export function verifyGlobalFreshdeskSupportWebhookSecret(
  headerValue: string | null | undefined
): boolean {
  if (!isFreshdeskGlobalWebhookSecretAllowed()) return false;

  const expected = env.FRESHDESK_SUPPORT_WEBHOOK_SECRET;
  if (!expected || !headerValue) return false;

  const received = headerValue.trim();
  if (received.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export type FreshdeskWebhookAuthResult =
  | { ok: true; method: 'connection_hash' | 'global_fallback' }
  | { ok: false; status: 401 | 403; code: string };

export function verifyFreshdeskWebhookAuth(input: {
  headerSecret: string | null;
  connection: Pick<FreshdeskSupportConnectionRow, 'webhook_secret_hash'> | null;
  hasResolvedConnection: boolean;
}): FreshdeskWebhookAuthResult {
  const { headerSecret, connection, hasResolvedConnection } = input;
  const storedHash = connection?.webhook_secret_hash ?? null;

  if (storedHash) {
    if (!headerSecret) {
      return { ok: false, status: 401, code: 'unauthorized' };
    }
    if (verifyFreshdeskWebhookSecret(headerSecret, storedHash)) {
      return { ok: true, method: 'connection_hash' };
    }
    return { ok: false, status: 401, code: 'unauthorized' };
  }

  if (hasResolvedConnection) {
    if (isFreshdeskProductionIngestMode() && !isFreshdeskGlobalWebhookSecretAllowed()) {
      return { ok: false, status: 403, code: 'freshdesk_connection_secret_missing' };
    }
    if (verifyGlobalFreshdeskSupportWebhookSecret(headerSecret)) {
      return { ok: true, method: 'global_fallback' };
    }
    return { ok: false, status: 401, code: 'unauthorized' };
  }

  if (verifyGlobalFreshdeskSupportWebhookSecret(headerSecret)) {
    return { ok: true, method: 'global_fallback' };
  }

  return { ok: false, status: 401, code: 'unauthorized' };
}
