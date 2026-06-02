import { bigCommerceApiFetch } from '@/lib/commerce/bigcommerce/bigcommerceApi';
import { buildBigCommerceWebhookDeliveryUrl } from '@/lib/commerce/bigcommerce/bigcommerceConnectionShared';

const WEBHOOK_SCOPES = [
  'store/order/created',
  'store/order/updated',
  'store/order/refund/created',
  'store/app/uninstalled',
] as const;

export type RegisterBigCommerceWebhooksResult = {
  registered: string[];
  failed: Array<{ scope: string; error: string }>;
};

export async function registerBigCommerceWebhooks(input: {
  storeHash: string;
  accessToken: string;
}): Promise<RegisterBigCommerceWebhooksResult> {
  const destination = buildBigCommerceWebhookDeliveryUrl();
  const registered: string[] = [];
  const failed: Array<{ scope: string; error: string }> = [];

  for (const scope of WEBHOOK_SCOPES) {
    try {
      const res = await bigCommerceApiFetch(input.storeHash, input.accessToken, '/v3/hooks', {
        method: 'POST',
        body: JSON.stringify({
          scope,
          destination,
          is_active: true,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        failed.push({ scope, error: text.slice(0, 200) || `http_${res.status}` });
        continue;
      }
      registered.push(scope);
    } catch (err) {
      failed.push({
        scope,
        error: err instanceof Error ? err.message.slice(0, 200) : 'register_failed',
      });
    }
  }

  return { registered, failed };
}
