/**
 * Composite idempotency key for processed_webhooks (platform + store + native id).
 */
export function buildWebhookIdempotencyKey(
  platform: string,
  storeKey: string,
  nativeWebhookId: string,
): string {
  const p = platform.trim();
  const store = storeKey.trim();
  const id = nativeWebhookId.trim();
  if (!p || !store || !id) {
    throw new Error('webhook_idempotency_key_invalid');
  }
  return `${p}:${store}:${id}`;
}
