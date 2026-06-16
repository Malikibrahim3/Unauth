import '@shopify/shopify-api/adapters/node';
import { ApiVersion, shopifyApi } from '@shopify/shopify-api';
import { env } from '@/lib/utils/env';
import { SHOPIFY_SCOPES } from '@/lib/shopify/scopes';

const apiKey = env.SHOPIFY_API_KEY;
const apiSecretKey = env.SHOPIFY_API_SECRET;

if (!apiKey || !apiSecretKey) {
  throw new Error('Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET');
}

export const shopify = shopifyApi({
  apiKey,
  apiSecretKey,
  scopes: [...SHOPIFY_SCOPES],
  hostName: 'unauth-pi.vercel.app',
  apiVersion: ApiVersion.January25,
  isEmbeddedApp: false,
});
