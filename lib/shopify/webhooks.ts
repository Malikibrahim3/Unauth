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
  'app/uninstalled',
] as const;

export function verifyShopifyWebhookHmac(rawBody: string, providedHmac: string | null): boolean {
  if (!providedHmac) return false;
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
  for (const topic of WEBHOOK_TOPICS) {
    await fetch(`https://${shopDomain}/admin/api/${apiVersion}/webhooks.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ webhook: { topic, address, format: 'json' } }),
      cache: 'no-store',
    });
  }
}
