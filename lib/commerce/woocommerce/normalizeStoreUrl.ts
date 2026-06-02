export type NormalizedWooCommerceStore = {
  store_url: string;
  store_key: string;
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Normalise a WooCommerce store URL to canonical HTTPS base + hostname store_key.
 */
export function normalizeWooCommerceStoreUrl(input: string): NormalizedWooCommerceStore {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('woocommerce_store_url_required');
  }

  let parsed: URL;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(withScheme);
  } catch {
    throw new Error('woocommerce_store_url_invalid');
  }

  if (!parsed.hostname) {
    throw new Error('woocommerce_store_url_invalid');
  }

  const store_key = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const store_url = stripTrailingSlash(`https://${store_key}`);

  return { store_url, store_key };
}

/**
 * Derive store_key from WooCommerce webhook X-WC-Webhook-Source header value.
 */
export function storeKeyFromWebhookSource(source: string): string | null {
  const trimmed = source.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const hostname = new URL(withScheme).hostname.toLowerCase().replace(/^www\./, '');
    return hostname || null;
  } catch {
    return null;
  }
}
