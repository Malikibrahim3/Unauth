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

jest.mock('@/lib/commerce/processedWebhookHandler', () => ({
  claimProcessedWebhook: jest.fn(),
  completeProcessedWebhook: jest.fn(),
}));

jest.mock('@/lib/commerce/bigcommerce/processOrderWebhook', () => ({
  processBigCommerceOrderWebhook: jest.fn(),
}));

jest.mock('@/lib/commerce/bigcommerce/processRefundWebhook', () => ({
  processBigCommerceRefundWebhook: jest.fn(),
}));

jest.mock('@/lib/commerce/bigcommerce/processAppUninstalled', () => ({
  processBigCommerceAppUninstalled: jest.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';
import { processBigCommerceOrderWebhook } from '@/lib/commerce/bigcommerce/processOrderWebhook';
import { POST } from '@/app/api/bigcommerce/webhooks/route';

const STORE_HASH = 'abc123xyz';
const BC_WEBHOOK_SECRET = 'bc_test_secret';

jest.mock('@/lib/utils/env', () => ({
  env: {
    BIGCOMMERCE_CLIENT_SECRET: 'bc_test_secret',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

function signedHeaders(rawBody: string, timestamp = Math.floor(Date.now() / 1000)): Record<string, string> {
  const webhookId = 'msg-bigcommerce-1';
  const signature = crypto
    .createHmac('sha256', BC_WEBHOOK_SECRET)
    .update(`${webhookId}.${timestamp}.${rawBody}`, 'utf8')
    .digest('base64');
  return {
    'webhook-id': webhookId,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': `v1,${signature}`,
  };
}

describe('bigcommerce webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createServiceClient as jest.Mock).mockReturnValue({});
    (claimProcessedWebhook as jest.Mock).mockResolvedValue({
      status: 'claimed',
      duplicate: false,
      conflict: false,
      idempotencyKey: `bigcommerce:${STORE_HASH}:delivery-1`,
      claimToken: '10000000-0000-4000-8000-000000000001',
    });
    (completeProcessedWebhook as jest.Mock).mockResolvedValue(undefined);
    (processBigCommerceOrderWebhook as jest.Mock).mockResolvedValue(undefined);
  });

  it('rejects invalid signature', async () => {
    const rawBody = JSON.stringify({
      producer: `stores/${STORE_HASH}`,
      scope: 'store/order/created',
      hash: 'delivery-1',
      data: { type: 'order', id: 1 },
    });
    const req = new NextRequest('http://localhost/api/bigcommerce/webhooks', {
      method: 'POST',
      body: rawBody,
      headers: { ...signedHeaders(rawBody), 'webhook-signature': 'v1,bad' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('processes store/order/created', async () => {
    const rawBody = JSON.stringify({
      producer: `stores/${STORE_HASH}`,
      scope: 'store/order/created',
      hash: 'delivery-1',
      created_at: 1_790_000_000,
      data: { type: 'order', id: 1001 },
    });
    const req = new NextRequest('http://localhost/api/bigcommerce/webhooks', {
      method: 'POST',
      body: rawBody,
      headers: signedHeaders(rawBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(processBigCommerceOrderWebhook).toHaveBeenCalled();
    expect(completeProcessedWebhook).toHaveBeenCalledWith(
      expect.anything(),
      `bigcommerce:${STORE_HASH}:delivery-1`,
      '10000000-0000-4000-8000-000000000001',
      'completed',
      null,
    );
    expect(claimProcessedWebhook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rawBody,
        nativeWebhookId: 'delivery-1',
        objectKey: 'order:1001',
        eventVersion: 1_790_000_000_000,
      }),
    );
  });

  it('rejects a correctly signed but stale delivery', async () => {
    const rawBody = JSON.stringify({
      producer: `stores/${STORE_HASH}`,
      scope: 'store/order/created',
      hash: 'delivery-stale',
      data: { type: 'order', id: 1002 },
    });
    const req = new NextRequest('http://localhost/api/bigcommerce/webhooks', {
      method: 'POST',
      body: rawBody,
      headers: signedHeaders(rawBody, Math.floor(Date.now() / 1000) - 301),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(claimProcessedWebhook).not.toHaveBeenCalled();
  });
});
