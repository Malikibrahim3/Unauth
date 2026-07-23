import crypto from 'crypto';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/ratelimit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  limitFromEnv: jest.fn().mockReturnValue({ limit: 1000, windowSec: 60 }),
  rateLimitKey: jest.fn().mockReturnValue('key'),
}));

jest.mock('@/lib/commerce/woocommerce/settingsConnection', () => ({
  loadWooCommerceCredentialsForStore: jest.fn(),
}));

jest.mock('@/lib/commerce/credentialCrypto', () => ({
  decryptWooCommerceCredentials: jest.fn(),
}));

jest.mock('@/lib/commerce/processedWebhookHandler', () => ({
  claimProcessedWebhook: jest.fn(),
  completeProcessedWebhook: jest.fn(),
}));

jest.mock('@/lib/commerce/woocommerce/processOrderWebhook', () => ({
  processWooCommerceOrderWebhook: jest.fn(),
}));

jest.mock('@/lib/commerce/woocommerce/processRefundWebhook', () => ({
  processWooCommerceRefundWebhook: jest.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { decryptWooCommerceCredentials } from '@/lib/commerce/credentialCrypto';
import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';
import { loadWooCommerceCredentialsForStore } from '@/lib/commerce/woocommerce/settingsConnection';
import { processWooCommerceOrderWebhook } from '@/lib/commerce/woocommerce/processOrderWebhook';
import { POST } from '@/app/api/woocommerce/webhooks/route';

const STORE_KEY = 'store.example.com';
const SECRET = 'cs_test_secret';

function signBody(rawBody: string): string {
  return crypto.createHmac('sha256', SECRET).update(rawBody, 'utf8').digest('base64');
}

describe('woocommerce webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createServiceClient as jest.Mock).mockReturnValue({});
    (loadWooCommerceCredentialsForStore as jest.Mock).mockResolvedValue({
      store_url: `https://${STORE_KEY}`,
      credentials_encrypted: 'blob',
    });
    (decryptWooCommerceCredentials as jest.Mock).mockReturnValue({
      consumer_key: 'ck',
      consumer_secret: SECRET,
    });
    (claimProcessedWebhook as jest.Mock).mockResolvedValue({
      status: 'claimed',
      duplicate: false,
      conflict: false,
      idempotencyKey: `woocommerce:${STORE_KEY}:delivery-1`,
      claimToken: '10000000-0000-4000-8000-000000000001',
    });
    (completeProcessedWebhook as jest.Mock).mockResolvedValue(undefined);
    (processWooCommerceOrderWebhook as jest.Mock).mockResolvedValue(undefined);
  });

  it('rejects invalid signature', async () => {
    const rawBody = JSON.stringify({ id: 1 });
    const req = new NextRequest('http://localhost/api/woocommerce/webhooks', {
      method: 'POST',
      body: rawBody,
      headers: {
        'x-wc-webhook-source': `https://${STORE_KEY}`,
        'x-wc-webhook-topic': 'order.created',
        'x-wc-webhook-id': 'wh-1',
        'x-wc-webhook-delivery-id': 'delivery-1',
        'x-wc-webhook-signature': 'bad',
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('processes order.created', async () => {
    const payload = {
      id: 1001,
      date_created: '2024-06-01T12:00:00',
      billing: { email: 'buyer@example.com' },
    };
    const rawBody = JSON.stringify(payload);
    const req = new NextRequest('http://localhost/api/woocommerce/webhooks', {
      method: 'POST',
      body: rawBody,
      headers: {
        'x-wc-webhook-source': `https://${STORE_KEY}`,
        'x-wc-webhook-topic': 'order.created',
        'x-wc-webhook-id': 'wh-1',
        'x-wc-webhook-delivery-id': 'delivery-1',
        'x-wc-webhook-signature': signBody(rawBody),
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(processWooCommerceOrderWebhook).toHaveBeenCalled();
    expect(completeProcessedWebhook).toHaveBeenCalledWith(
      expect.anything(),
      `woocommerce:${STORE_KEY}:delivery-1`,
      '10000000-0000-4000-8000-000000000001',
      'completed',
      null,
    );
    expect(claimProcessedWebhook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        nativeWebhookId: 'delivery-1',
        rawBody,
        objectKey: 'order:1001',
        eventVersion: Date.parse('2024-06-01T12:00:00Z'),
      }),
    );
  });

  it('returns 5xx and marks the claim failed so WooCommerce retries', async () => {
    (processWooCommerceOrderWebhook as jest.Mock).mockRejectedValueOnce(new Error('partial_failure'));
    const rawBody = JSON.stringify({ id: 1002 });
    const req = new NextRequest('http://localhost/api/woocommerce/webhooks', {
      method: 'POST',
      body: rawBody,
      headers: {
        'x-wc-webhook-source': `https://${STORE_KEY}`,
        'x-wc-webhook-topic': 'order.created',
        'x-wc-webhook-id': 'wh-1',
        'x-wc-webhook-delivery-id': 'delivery-2',
        'x-wc-webhook-signature': signBody(rawBody),
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(completeProcessedWebhook).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      '10000000-0000-4000-8000-000000000001',
      'failed',
      expect.stringContaining('partial_failure'),
    );
  });
});
