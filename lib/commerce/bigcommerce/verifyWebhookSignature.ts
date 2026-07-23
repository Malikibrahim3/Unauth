import { env } from '@/lib/utils/env';
import {
  readStandardWebhookHeaders,
  verifyStandardWebhookSignature,
} from '@/lib/webhooks/standardSignature';

/**
 * BigCommerce HTTPS webhooks use the Standard Webhooks signed
 * id/timestamp/raw-body format with the app client secret as key material.
 */
export function verifyBigCommerceWebhookSignature(
  rawBody: string,
  headers: Headers | { get(name: string): string | null },
  options: { nowSeconds?: number; toleranceSeconds?: number } = {},
): boolean {
  const secret = env.BIGCOMMERCE_CLIENT_SECRET;
  if (!secret) return false;
  return verifyStandardWebhookSignature({
    rawBody,
    secretBytes: Buffer.from(secret, 'utf8'),
    headers: readStandardWebhookHeaders(headers),
    ...options,
  });
}
