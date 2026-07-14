import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/utils/env';
import { verifyZendeskWebhookSecret } from '@/lib/support/zendesk/webhookSecret';
import type { ZendeskSupportConnectionRow } from '@/lib/support/zendesk/resolveConnection';
import { isZendeskProductionIngestMode } from '@/lib/support/zendesk/resolveMerchantId';

export { ZENDESK_SUPPORT_SECRET_HEADERS } from '@/lib/support/zendesk/supportConnectionShared';
import {
  ZENDESK_SUPPORT_SECRET_HEADERS,
  ZENDESK_WEBHOOK_SECRET_QUERY_PARAM,
} from '@/lib/support/zendesk/supportConnectionShared';

export function readZendeskWebhookSecretHeader(
  headers: Headers | { get(name: string): string | null }
): string | null {
  for (const name of ZENDESK_SUPPORT_SECRET_HEADERS) {
    const value = headers.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

/** Header first, then the secret query param baked into the registered webhook URL. */
export function readZendeskWebhookSecret(
  headers: Headers | { get(name: string): string | null },
  webhookSearchParams?: URLSearchParams | null
): string | null {
  const fromHeader = readZendeskWebhookSecretHeader(headers);
  if (fromHeader) return fromHeader;
  const fromQuery = webhookSearchParams?.get(ZENDESK_WEBHOOK_SECRET_QUERY_PARAM)?.trim();
  return fromQuery || null;
}

export function isZendeskGlobalWebhookSecretAllowed(): boolean {
  return !isZendeskProductionIngestMode() && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || env.VERCEL_ENV === 'development');
}

/** Dev/test fallback: compare header to global env secret (plaintext, timing-safe). */
export function verifyGlobalZendeskSupportWebhookSecret(
  headerValue: string | null | undefined
): boolean {
  if (!isZendeskGlobalWebhookSecretAllowed()) return false;

  const expected = env.ZENDESK_SUPPORT_WEBHOOK_SECRET;
  if (!expected || !headerValue) return false;

  const received = headerValue.trim();
  if (received.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export type ZendeskWebhookAuthResult =
  | { ok: true; method: 'connection_hash' | 'global_fallback' }
  | { ok: false; status: 401 | 403; code: string };

export type VerifyZendeskWebhookAuthInput = {
  headerSecret: string | null;
  connection: Pick<ZendeskSupportConnectionRow, 'webhook_secret_hash'> | null;
  hasResolvedConnection: boolean;
};

export function verifyZendeskWebhookAuth(
  input: VerifyZendeskWebhookAuthInput
): ZendeskWebhookAuthResult {
  const { headerSecret, connection, hasResolvedConnection } = input;
  const storedHash = connection?.webhook_secret_hash ?? null;

  if (storedHash) {
    if (!headerSecret) {
      return { ok: false, status: 401, code: 'unauthorized' };
    }
    if (verifyZendeskWebhookSecret(headerSecret, storedHash)) {
      return { ok: true, method: 'connection_hash' };
    }
    return { ok: false, status: 401, code: 'unauthorized' };
  }

  if (hasResolvedConnection) {
    if (isZendeskProductionIngestMode() && !isZendeskGlobalWebhookSecretAllowed()) {
      return { ok: false, status: 403, code: 'zendesk_connection_secret_missing' };
    }
    if (verifyGlobalZendeskSupportWebhookSecret(headerSecret)) {
      return { ok: true, method: 'global_fallback' };
    }
    return { ok: false, status: 401, code: 'unauthorized' };
  }

  if (verifyGlobalZendeskSupportWebhookSecret(headerSecret)) {
    return { ok: true, method: 'global_fallback' };
  }

  return { ok: false, status: 401, code: 'unauthorized' };
}
