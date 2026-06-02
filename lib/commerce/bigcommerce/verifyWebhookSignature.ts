import crypto from 'crypto';
import { env } from '@/lib/utils/env';

/**
 * Verify BigCommerce webhook signature (X-BC-Signature, base64 HMAC-SHA256).
 */
export function verifyBigCommerceWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = env.BIGCOMMERCE_CLIENT_SECRET;
  if (!secret || !signatureHeader?.trim()) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  const received = signatureHeader.trim();
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}
