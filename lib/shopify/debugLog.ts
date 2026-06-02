import { redactSensitiveData } from '@/lib/log/redactSensitiveData';

type ShopifyDebugPayload = Record<string, string | number | boolean | null | undefined>;

/** Temporary safe debug logging for Shopify OAuth — no tokens, secrets, HMAC, or PII. */
export function shopifyDebugLog(event: string, payload: ShopifyDebugPayload = {}): void {
  console.info(`[shopify.oauth] ${event}`, redactSensitiveData(payload));
}
