import { createHmac, timingSafeEqual } from 'node:crypto';

export type StandardWebhookHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export function readStandardWebhookHeaders(
  headers: Headers | { get(name: string): string | null },
): StandardWebhookHeaders {
  return {
    id: headers.get('webhook-id'),
    timestamp: headers.get('webhook-timestamp'),
    signature: headers.get('webhook-signature'),
  };
}

/** Verify a Standard Webhooks / Svix-style signed delivery and freshness. */
export function verifyStandardWebhookSignature(input: {
  rawBody: string;
  secretBytes: Buffer;
  headers: StandardWebhookHeaders;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  const { id, timestamp, signature } = input.headers;
  if (!id?.trim() || !timestamp?.trim() || !signature?.trim() || input.secretBytes.length === 0) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > (input.toleranceSeconds ?? 300)
  ) {
    return false;
  }

  const expected = createHmac('sha256', input.secretBytes)
    .update(`${id}.${timestamp}.${input.rawBody}`)
    .digest('base64');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  return signature.split(/\s+/).some((part) => {
    const value = part.includes(',') ? part.slice(part.indexOf(',') + 1) : part;
    const received = Buffer.from(value, 'utf8');
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  });
}
