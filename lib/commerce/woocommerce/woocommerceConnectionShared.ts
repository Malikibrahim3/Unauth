export const WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR =
  'Could not verify WooCommerce credentials. Check the store URL, consumer key, and consumer secret.';
export const WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR_CODE = 'woocommerce_credentials_invalid';

export const WOOCOMMERCE_WEBHOOK_PATH = '/api/woocommerce/webhooks';

export class WooCommerceCredentialsError extends Error {
  constructor(message = WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR_CODE) {
    super(message);
    this.name = 'WooCommerceCredentialsError';
  }
}

export type WooCommerceConnectionSettings = {
  id: string;
  store_key: string;
  store_url: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  credentials_configured: boolean;
  webhook_url: string;
};
