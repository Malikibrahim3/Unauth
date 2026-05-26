import '@shopify/shopify-api/adapters/node';
import { ApiVersion, shopifyApi } from '@shopify/shopify-api';
import { getAppUrl } from '@/lib/utils/appUrl';

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecretKey = process.env.SHOPIFY_API_SECRET;

if (!apiKey || !apiSecretKey) {
  throw new Error('Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET');
}

export const SHOPIFY_SCOPES = ['read_orders', 'read_customers'] as const;

export const shopify = shopifyApi({
  apiKey,
  apiSecretKey,
  scopes: [...SHOPIFY_SCOPES],
  hostName: getAppUrl().replace(/^https?:\/\//, ''),
  apiVersion: ApiVersion.October25,
  isEmbeddedApp: false,
});

