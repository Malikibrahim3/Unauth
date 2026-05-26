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

jest.mock('@/lib/shopify/profileLinking', () => ({
  syncShopifyProfilesForShop: jest.fn(async () => ({
    groups: 1,
    profilesCreated: 1,
    profilesLinked: 0,
    identitiesUpserted: 2,
  })),
}));

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as { createServiceClient: jest.Mock };
const { syncShopifyProfilesForShop } = jest.requireMock('@/lib/shopify/profileLinking') as { syncShopifyProfilesForShop: jest.Mock };

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
    syncShopifyProfilesForShop.mockResolvedValue({ groups: 1, profilesCreated: 1, profilesLinked: 0, identitiesUpserted: 2 });
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
        if (table === 'shopify_order_signals') {
          return { upsert: async () => ({ error: null }) };
        }
        if (table === 'shopify_merchants') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { access_token: null }, error: null }),
              }),
            }),
          };
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

  it('successful orders/create finalizes as completed', async () => {
    const updates: any[] = [];
    const signalUpserts: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
            upsert: async () => ({ error: null }),
            update: (payload: any) => {
              updates.push(payload);
              return { eq: async () => ({ error: null }) };
            },
          };
        }
        if (table === 'merchant_identities') {
          return { upsert: async () => ({ error: null }) };
        }
        if (table === 'shopify_order_signals') {
          return { upsert: async (payload: any) => { signalUpserts.push(payload); return { error: null }; } };
        }
        if (table === 'shopify_merchants') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { access_token: null }, error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = '{"id":10,"email":"ok@test.com"}';
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'orders/create',
      'x-shopify-webhook-id': 'wid-complete-create',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(updates.some((u) => u.status === 'completed')).toBe(true);
    expect(updates.some((u) => u.status === 'failed')).toBe(false);
    expect(signalUpserts.length).toBe(1);
    const signal = signalUpserts[0];
    expect(signal.shop_domain).toBe('unit-test.myshopify.com');
    expect(signal.shopify_order_id).toBe('10');
    expect(signal.raw_payload_hash).toMatch(/^[a-f0-9]{64}$/);
    expect((signal as any).email).toBeUndefined();
    expect((signal as any).phone).toBeUndefined();
    expect((signal as any).shipping_address).toBeUndefined();
    expect((signal as any).billing_address).toBeUndefined();
  });

  it('successful orders/updated finalizes as completed', async () => {
    const updates: any[] = [];
    const signalUpserts: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
            upsert: async () => ({ error: null }),
            update: (payload: any) => {
              updates.push(payload);
              return { eq: async () => ({ error: null }) };
            },
          };
        }
        if (table === 'merchant_identities') {
          return { upsert: async () => ({ error: null }) };
        }
        if (table === 'shopify_order_signals') {
          return { upsert: async (payload: any) => { signalUpserts.push(payload); return { error: null }; } };
        }
        if (table === 'shopify_merchants') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { access_token: null }, error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = '{"id":11,"customer":{"id":44,"email":"u@test.com"}}';
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'orders/updated',
      'x-shopify-webhook-id': 'wid-complete-updated',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(updates.some((u) => u.status === 'completed')).toBe(true);
    expect(updates.some((u) => u.status === 'failed')).toBe(false);
    expect(signalUpserts.length).toBe(1);
  });

  it('failed processing finalizes as failed', async () => {
    const { upsertMerchantIdentityRows } = jest.requireMock('@/lib/shopify/identity') as { upsertMerchantIdentityRows: jest.Mock };
    upsertMerchantIdentityRows.mockImplementationOnce(async () => {
      throw new Error('insert_failed');
    });
    const updates: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
            upsert: async () => ({ error: null }),
            update: (payload: any) => {
              updates.push(payload);
              return { eq: async () => ({ error: null }) };
            },
          };
        }
        if (table === 'merchant_identities') {
          return { upsert: async () => ({ error: { message: 'insert_failed' } }) };
        }
        if (table === 'shopify_order_signals') {
          return { upsert: async () => ({ error: null }) };
        }
        if (table === 'shopify_merchants') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { access_token: null }, error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = '{"id":12,"email":"fail@test.com"}';
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'orders/create',
      'x-shopify-webhook-id': 'wid-failed',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(updates.some((u) => u.status === 'failed')).toBe(true);
  });

  it('duplicate webhook updates same signal row via stable upsert key', async () => {
    const signalUpserts: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { webhook_id: 'wid-same', status: 'failed', attempts: 1 }, error: null }) }) }),
            upsert: async () => ({ error: null }),
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        if (table === 'merchant_identities') return { upsert: async () => ({ error: null }) };
        if (table === 'shopify_order_signals') {
          return {
            upsert: async (payload: any, opts: any) => {
              signalUpserts.push({ payload, opts });
              return { error: null };
            },
          };
        }
        if (table === 'shopify_merchants') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { access_token: null }, error: null }) }) }) };
        }
        return {};
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = '{"id":99,"email":"same@test.com"}';
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'orders/create',
      'x-shopify-webhook-id': 'wid-same',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(signalUpserts.length).toBe(1);
    expect(signalUpserts[0].opts.onConflict).toBe('shop_domain,shopify_order_id');
  });

  it('refund webhook inserts refund event without PII and finalizes completed', async () => {
    const updates: any[] = [];
    const refundUpserts: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
            upsert: async () => ({ error: null }),
            update: (payload: any) => { updates.push(payload); return { eq: async () => ({ error: null }) }; },
          };
        }
        if (table === 'merchant_identities') return { upsert: async () => ({ error: null }) };
        if (table === 'shopify_refund_events') {
          return { upsert: async (payload: any, opts: any) => { refundUpserts.push({ payload, opts }); return { error: null }; } };
        }
        return { upsert: async () => ({ error: null }) };
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = JSON.stringify({ id: 201, order_id: 901, currency: 'USD', note: 'customer request', refund_line_items: [{ id: 1 }], transactions: [{ amount: '10.00' }] });
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'refunds/create',
      'x-shopify-webhook-id': 'wid-refund-1',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(refundUpserts.length).toBe(1);
    expect(refundUpserts[0].opts.onConflict).toBe('shop_domain,refund_id');
    expect(refundUpserts[0].payload.tracking_number).toBeUndefined();
    expect(refundUpserts[0].payload.email).toBeUndefined();
    expect(updates.some((u) => u.status === 'completed')).toBe(true);
  });

  it('fulfillment webhook inserts fulfillment event with hashed tracking only', async () => {
    const fulfillmentUpserts: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
            upsert: async () => ({ error: null }),
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        if (table === 'merchant_identities') return { upsert: async () => ({ error: null }) };
        if (table === 'shopify_fulfillment_events') {
          return { upsert: async (payload: any, opts: any) => { fulfillmentUpserts.push({ payload, opts }); return { error: null }; } };
        }
        return { upsert: async () => ({ error: null }) };
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = JSON.stringify({ id: 333, order_id: 777, tracking_company: 'UPS', tracking_number: '1Z999AA10123456784', tracking_urls: ['https://x.test/t/1'], shipment_status: 'in_transit', status: 'success' });
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'fulfillments/create',
      'x-shopify-webhook-id': 'wid-fulfill-1',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fulfillmentUpserts.length).toBe(1);
    expect(fulfillmentUpserts[0].opts.onConflict).toBe('shop_domain,fulfillment_id');
    expect(fulfillmentUpserts[0].payload.tracking_number_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(fulfillmentUpserts[0].payload.tracking_number).toBeUndefined();
    expect(fulfillmentUpserts[0].payload.tracking_urls).toBeUndefined();
  });

  it('failed fulfillment processing finalizes as failed', async () => {
    const updates: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'processed_webhooks') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
            upsert: async () => ({ error: null }),
            update: (payload: any) => { updates.push(payload); return { eq: async () => ({ error: null }) }; },
          };
        }
        if (table === 'shopify_fulfillment_events') {
          return { upsert: async () => { throw new Error('boom'); } };
        }
        if (table === 'merchant_identities') return { upsert: async () => ({ error: null }) };
        return { upsert: async () => ({ error: null }) };
      },
    };
    createServiceClient.mockReturnValue(supabase);
    const body = JSON.stringify({ id: 334, order_id: 778 });
    const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
    const req = makeReq(body, {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'fulfillments/update',
      'x-shopify-webhook-id': 'wid-fulfill-fail',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(updates.some((u) => u.status === 'failed')).toBe(true);
  });
});
