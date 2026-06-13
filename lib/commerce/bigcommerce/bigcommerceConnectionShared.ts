import { env } from '@/lib/utils/env';

export const BIGCOMMERCE_WEBHOOK_PATH = '/api/bigcommerce/webhooks';

export function buildBigCommerceWebhookDeliveryUrl(): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  return `${base}${BIGCOMMERCE_WEBHOOK_PATH}`;
}

export const BIGCOMMERCE_OAUTH_SCOPES = [
  'store_v2_orders',
  'store_v2_customers',
  'store_v2_transactions',
  'store_v2_content',
].join(' ');

export type BigCommerceConnectionSettings = {
  id: string;
  store_key: string;
  store_url: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  credentials_configured: boolean;
  webhook_url: string;
};

export function bigCommerceApiBaseUrl(storeHash: string): string {
  return `https://api.bigcommerce.com/stores/${storeHash}`;
}

export function bigCommerceStorefrontUrl(storeHash: string): string {
  return `https://store-${storeHash}.mybigcommerce.com`;
}
