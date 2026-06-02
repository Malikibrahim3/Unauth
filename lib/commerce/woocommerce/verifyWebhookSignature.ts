import crypto from 'crypto';

/**
 * Verify WooCommerce webhook HMAC (X-WC-Webhook-Signature, base64).
 */
export function verifyWooCommerceWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  consumerSecret: string,
): boolean {
  if (!signatureHeader?.trim()) return false;
  const expected = crypto
    .createHmac('sha256', consumerSecret)
    .update(rawBody, 'utf8')
    .digest('base64');
  const received = signatureHeader.trim();
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}
