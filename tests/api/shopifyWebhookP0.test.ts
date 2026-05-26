import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { processWebhook, POST } from '@/app/api/shopify/webhooks/route';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/shopify/identity', () => ({
  normalizeAddress: (v: any) => v ? 'addr' : null,
  normalizeEmail: (v: any) => (typeof v === 'string' ? v.toLowerCase() : null),
  normalizePhone: (v: any) => (typeof v === 'string' ? v : null),
  upsertMerchantIdentityRows: jest.fn(async () => {}),
}));

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as { createServiceClient: jest.Mock };

function makeReq(body: string, headers: Record<string, string>) {
  return new NextRequest('http://localhost/api/shopify/webhooks', {
    method: 'POST',
    body,
    headers,
  } as any);
}

describe('shopify webhook p0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SHOPIFY_WEBHOOK_SECRET = 'test-secret';
  });

  it('rejects invalid webhook hmac', async () => {
    const req = makeReq('{"id":1}', {
      'x-shopify-hmac-sha256': 'invalid',
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'orders/create',
      'x-shopify-webhook-id': 'wid-1',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('uninstall webhook deactivates merchant connection and nulls token', async () => {
    const updates: Array<{ table: string; values: any }> = [];
    const supabase = {
      from: (table: string) => ({
        update: (values: any) => {
          updates.push({ table, values });
          return { eq: async () => ({ error: null }) };
        },
      }),
    };
    await processWebhook('{}', 'unit-test.myshopify.com', 'app/uninstalled', supabase);
    expect(updates.some((u) => u.table === 'shopify_merchants' && u.values.access_token === null)).toBe(true);
    expect(updates.some((u) => u.table === 'merchant_shopify_connections' && u.values.active === false)).toBe(true);
  });

  it('duplicate completed webhook is short-circuited', async () => {
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { webhook_id: 'wid-2', status: 'completed', attempts: 1 }, error: null }) }) }),
          };
        }
        return {};
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = '{"id":1}';
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'orders/create',
      'x-shopify-webhook-id': 'wid-2',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('failed webhook can be retried by re-entering processing', async () => {
    let upsertPayload: any = null;
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { webhook_id: 'wid-3', status: 'failed', attempts: 1 }, error: null }) }) }),
            upsert: async (payload: any) => {
              upsertPayload = payload;
              return { error: null };
            },
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        if (table === 'merchant_identities') {
          return { upsert: async () => ({ error: null }) };
        }
        return {};
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = '{"id":1,"email":"a@b.com"}';
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'orders/create',
      'x-shopify-webhook-id': 'wid-3',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsertPayload.status).toBe('processing');
    expect(upsertPayload.attempts).toBe(2);
  });
});

