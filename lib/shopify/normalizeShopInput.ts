export type NormalizeShopResult =
  | { domain: string; error: null }
  | { domain: null; error: 'empty' | 'public_domain' | 'invalid' };

/**
 * Accepts any reasonable way a merchant might identify their Shopify store and
 * returns the canonical .myshopify.com domain needed for Shopify OAuth.
 *
 * Accepted formats:
 *   admin.shopify.com/store/skims          → skims.myshopify.com
 *   https://admin.shopify.com/store/skims  → skims.myshopify.com
 *   skims.myshopify.com                    → skims.myshopify.com
 *   https://skims.myshopify.com            → skims.myshopify.com
 *   skims                                  → skims.myshopify.com (bare slug fallback)
 *
 * Rejected formats:
 *   skims.com / www.skims.com              → error: 'public_domain'
 *   (empty)                                → error: 'empty'
 *   anything else unrecognised             → error: 'invalid'
 */
export function normalizeShopInput(raw: string): NormalizeShopResult {
  const v = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!v) return { domain: null, error: 'empty' };

  // admin.shopify.com/store/<slug>
  const adminMatch = v.match(/^admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)(?:\/.*)?$/);
  if (adminMatch) return { domain: `${adminMatch[1]}.myshopify.com`, error: null };

  // <slug>.myshopify.com (with optional trailing path segments)
  const myshopifyMatch = v.match(/^([a-z0-9][a-z0-9-]*)\.myshopify\.com(?:\/.*)?$/);
  if (myshopifyMatch) return { domain: `${myshopifyMatch[1]}.myshopify.com`, error: null };

  // bare slug — no dots, just the store identifier
  if (/^[a-z0-9][a-z0-9-]*$/.test(v)) return { domain: `${v}.myshopify.com`, error: null };

  // anything with dots that didn't match above is likely a public domain (e.g. skims.com)
  if (v.includes('.')) return { domain: null, error: 'public_domain' };

  return { domain: null, error: 'invalid' };
}
