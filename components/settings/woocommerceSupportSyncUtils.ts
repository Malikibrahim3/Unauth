import {
  WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR_CODE,
  type WooCommerceConnectionSettings,
} from '@/lib/commerce/woocommerce/woocommerceConnectionShared';

export function buildWooCommerceConnectPayload(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
) {
  return {
    store_url: storeUrl.trim(),
    consumer_key: consumerKey.trim(),
    consumer_secret: consumerSecret.trim(),
  };
}

export type WooCommerceConnectResponseBody = {
  connection?: WooCommerceConnectionSettings;
  error?: string;
  code?: string;
  webhooks_registered?: string[];
  webhooks_failed?: Array<{ topic: string; error: string }>;
};

export function parseWooCommerceConnectResponse(body: unknown): WooCommerceConnectResponseBody {
  if (!body || typeof body !== 'object') return {};
  return body as WooCommerceConnectResponseBody;
}

export function resolveWooCommerceConnectMessage(body: WooCommerceConnectResponseBody): {
  message: { type: 'success' | 'error'; text: string } | null;
} {
  if (body.code === WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR_CODE) {
    return { message: { type: 'error', text: body.error ?? 'Invalid credentials' } };
  }
  if (body.connection?.status === 'active') {
    const webhookNote =
      body.webhooks_failed && body.webhooks_failed.length > 0
        ? ' Some webhooks could not be registered automatically — configure them in WooCommerce admin if orders do not sync.'
        : '';
    return {
      message: {
        type: 'success',
        text: `WooCommerce connected.${webhookNote}`,
      },
    };
  }
  return { message: null };
}
