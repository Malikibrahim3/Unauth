import { redactSensitiveData } from '@/lib/log/redactSensitiveData';

type ShopifyAuditPayload = Record<string, string | number | boolean | null | undefined>;

/** Safe structured logging for Shopify → audit_transactions bridge (no tokens or PII). */
export function shopifyAuditLog(event: string, payload: ShopifyAuditPayload = {}): void {
  console.info(`[shopify.audit] ${event}`, redactSensitiveData(payload));
}

export function shopifyAuditError(event: string, err: unknown, payload: ShopifyAuditPayload = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[shopify.audit] ${event}`, redactSensitiveData({ ...payload, message, stack }));
}
