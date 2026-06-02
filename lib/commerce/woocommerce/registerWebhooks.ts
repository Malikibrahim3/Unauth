import { env } from '@/lib/utils/env';
import type { WooCommerceRestCredentials } from '@/lib/commerce/credentialCrypto';
import { wooCommerceApiFetch } from '@/lib/commerce/woocommerce/woocommerceApi';
import { WOOCOMMERCE_WEBHOOK_PATH } from '@/lib/commerce/woocommerce/woocommerceConnectionShared';

const WEBHOOK_TOPICS = ['order.created', 'order.updated', 'order.refunded'] as const;

export function buildWooCommerceWebhookDeliveryUrl(): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  return `${base}${WOOCOMMERCE_WEBHOOK_PATH}`;
}

export type RegisterWooCommerceWebhooksResult = {
  registered: string[];
  failed: Array<{ topic: string; error: string }>;
};

export async function registerWooCommerceWebhooks(
  storeUrl: string,
  credentials: WooCommerceRestCredentials,
): Promise<RegisterWooCommerceWebhooksResult> {
  const deliveryUrl = buildWooCommerceWebhookDeliveryUrl();
  const registered: string[] = [];
  const failed: Array<{ topic: string; error: string }> = [];

  for (const topic of WEBHOOK_TOPICS) {
    try {
      const res = await wooCommerceApiFetch(storeUrl, credentials, '/wp-json/wc/v3/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          name: `Unauth ${topic}`,
          topic,
          delivery_url: deliveryUrl,
          status: 'active',
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        failed.push({ topic, error: text.slice(0, 200) || `http_${res.status}` });
        continue;
      }
      registered.push(topic);
    } catch (err) {
      failed.push({
        topic,
        error: err instanceof Error ? err.message.slice(0, 200) : 'register_failed',
      });
    }
  }

  return { registered, failed };
}
