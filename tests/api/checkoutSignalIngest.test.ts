import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/checkout/collectorToken', () => ({
  verifyCollectorToken: jest.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { verifyCollectorToken } from '@/lib/checkout/collectorToken';
import { POST } from '@/app/api/checkout-signals/ingest/route';

const MERCHANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeClient(insertError: unknown = null) {
  const inserts: Array<Record<string, unknown>> = [];
  const rpc = jest.fn(async () => ({ data: 1, error: null }));
  const client = {
    rpc,
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: table === 'merchants' ? { id: MERCHANT_ID } : null,
          error: null,
        }),
        insert: (row: Record<string, unknown>) => {
          inserts.push(row);
          return builder;
        },
        single: async () => ({ data: insertError ? null : { id: 'signal-1' }, error: insertError }),
      };
      return builder;
    },
  };
  return { client, inserts, rpc };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'event-1',
    merchantId: MERCHANT_ID,
    collectorToken: 'signed-token',
    visitorId: 'visitor-1',
    sessionId: 'session-1',
    platform: 'shopify',
    page: '/checkout',
    checkoutReached: true,
    eventType: 'checkout',
    ts: 1_790_000_000_000,
    ...overrides,
  };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/checkout-signals/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('checkout signal intake safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyCollectorToken as jest.Mock).mockReturnValue(true);
  });

  it('authenticates the merchant-bound token before mutating rate-limit state', async () => {
    const mock = makeClient();
    (createServiceClient as jest.Mock).mockReturnValue(mock.client);
    (verifyCollectorToken as jest.Mock).mockReturnValue(false);

    const response = await POST(request(validBody()));

    expect(response.status).toBe(401);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.inserts).toHaveLength(0);
  });

  it('uses an atomic merchant-scoped event key on insert', async () => {
    const mock = makeClient();
    (createServiceClient as jest.Mock).mockReturnValue(mock.client);

    const response = await POST(request(validBody()));

    expect(response.status).toBe(200);
    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0]).toMatchObject({
      merchant_id: MERCHANT_ID,
      idempotency_key: `event:${createHash('sha256').update('event-1').digest('hex')}`,
    });
  });

  it('treats a uniqueness collision as a completed retry', async () => {
    const mock = makeClient({ code: '23505', message: 'duplicate' });
    (createServiceClient as jest.Mock).mockReturnValue(mock.client);

    const response = await POST(request(validBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('rejects oversized bodies before creating a database client', async () => {
    const response = await POST(request(validBody(), { 'content-length': String(33 * 1024) }));
    expect(response.status).toBe(413);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('rejects signals without a stable client timestamp', async () => {
    const mock = makeClient();
    (createServiceClient as jest.Mock).mockReturnValue(mock.client);
    const body = validBody();
    delete (body as { ts?: number }).ts;

    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.inserts).toHaveLength(0);
  });
});
