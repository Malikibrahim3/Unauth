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

function signBody(rawBody: string): string {
  return crypto.createHmac('sha256', BC_WEBHOOK_SECRET).update(rawBody, 'utf8').digest('base64');
}

describe('bigcommerce webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createServiceClient as jest.Mock).mockReturnValue({});
    (claimProcessedWebhook as jest.Mock).mockResolvedValue({
      duplicate: false,
      idempotencyKey: `bigcommerce:${STORE_HASH}:delivery-1`,
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
      headers: { 'x-bc-signature': 'bad' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('processes store/order/created', async () => {
    const rawBody = JSON.stringify({
      producer: `stores/${STORE_HASH}`,
      scope: 'store/order/created',
      hash: 'delivery-1',
      data: { type: 'order', id: 1001 },
    });
    const req = new NextRequest('http://localhost/api/bigcommerce/webhooks', {
      method: 'POST',
      body: rawBody,
      headers: { 'x-bc-signature': signBody(rawBody) },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(processBigCommerceOrderWebhook).toHaveBeenCalled();
    expect(completeProcessedWebhook).toHaveBeenCalledWith(
      expect.anything(),
      `bigcommerce:${STORE_HASH}:delivery-1`,
      'completed',
      null,
    );
  });
});
