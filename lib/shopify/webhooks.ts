import { createHmac, timingSafeEqual } from 'crypto';
import { getAppUrl } from '@/lib/utils/appUrl';
import { SHOPIFY_REST_API_VERSION } from '@/lib/shopify/apiVersion';

const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'refunds/create',
  'orders/cancelled',
  'fulfillments/create',
  'fulfillments/update',
  'app/uninstalled',
] as const;

type WebhookTopic = (typeof WEBHOOK_TOPICS)[number];
type WebhookRegistrationFailure = { topic: WebhookTopic; status: number; body: string };
type ShopifyWebhookListResponse = {
  webhooks?: Array<{ topic?: string | null; address?: string | null }>;
};

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
  const existing = new Set<string>();
  try {
    const listResponse = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_REST_API_VERSION}/webhooks.json?limit=250`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (listResponse.ok && typeof listResponse.json === 'function') {
      const payload = (await listResponse.json()) as ShopifyWebhookListResponse;
      for (const webhook of payload.webhooks ?? []) {
        if (webhook.topic && webhook.address) {
          existing.add(`${webhook.topic}|${webhook.address}`);
        }
      }
    }
  } catch {
    // Listing is an optimization. Creation below is still idempotent for duplicates.
  }

  const results = await Promise.all(
    WEBHOOK_TOPICS.map(async (topic): Promise<WebhookRegistrationFailure | null> => {
      if (existing.has(`${topic}|${address}`)) return null;
      const response = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_REST_API_VERSION}/webhooks.json`, {
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
      if (response.status === 422 && /already|taken|exists/i.test(body)) return null;
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
