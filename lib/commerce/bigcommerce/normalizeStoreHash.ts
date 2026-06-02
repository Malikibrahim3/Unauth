const STORE_HASH_REGEX = /^[a-z0-9]+$/i;

export function normalizeStoreHash(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || !STORE_HASH_REGEX.test(trimmed)) return null;
  return trimmed;
}

/** Parse OAuth callback context: `stores/{store_hash}`. */
export function storeHashFromOAuthContext(context: string | null): string | null {
  if (!context?.trim()) return null;
  const match = /^stores\/([a-z0-9]+)$/i.exec(context.trim());
  if (!match?.[1]) return null;
  return normalizeStoreHash(match[1]);
}

/** Parse webhook producer: `stores/{store_hash}`. */
export function storeHashFromWebhookProducer(producer: string | null): string | null {
  return storeHashFromOAuthContext(producer);
}
