import { createHmac, timingSafeEqual } from 'crypto';
import { getAppUrl } from '@/lib/utils/appUrl';

const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'refunds/create',
  'orders/cancelled',
  'fulfillments/create',
  'fulfillments/update',
  'disputes/create',
  'disputes/updated',
  'app/uninstalled',
] as const;

type WebhookTopic = (typeof WEBHOOK_TOPICS)[number];
type WebhookRegistrationFailure = { topic: WebhookTopic; status: number; body: string };

export function verifyShopifyWebhookHmac(rawBody: string, providedHmac: string | null): boolean {
  if (!providedHmac) return false;
  // Read at call time (not from singleton) so test environments that set
  // process.env.SHOPIFY_WEBHOOK_SECRET after module load still work correctly.
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  const left = Buffer.from(digest, 'utf8');
  const right = Buffer.from(providedHmac, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function registerShopifyWebhooks(input: { shopDomain: string; accessToken: string }) {
  const { shopDomain, accessToken } = input;
  const address = `${getAppUrl()}/api/shopify/webhooks`;
  const apiVersion = '2025-10';
  const results = await Promise.all(
    WEBHOOK_TOPICS.map(async (topic): Promise<WebhookRegistrationFailure | null> => {
      const response = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhook: { topic, address, format: 'json' } }),
        cache: 'no-store',
      });
      if (response.ok) return null;
      const body = await response.text().catch(() => '');
      return { topic, status: response.status, body: body.slice(0, 300) };
    })
  );
  const failures = results.filter((failure): failure is WebhookRegistrationFailure => failure !== null);

  if (failures.length > 0) {
    const summary = failures
      .map((failure) => `${failure.topic} -> ${failure.status}${failure.body ? ` ${failure.body}` : ''}`)
      .join('; ');
    throw new Error(`shopify_webhook_registration_failed: ${summary}`);
  }
}
