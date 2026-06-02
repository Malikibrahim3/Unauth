import { nudgeGorgiasTicketWidgetRefresh } from '@/lib/support/gorgias/widgetRefreshNudge';

describe('nudgeGorgiasTicketWidgetRefresh', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('updates ticket meta with a widget payload hash', async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return {
        ok: true,
        status: 200,
        json: async () =>
          init?.method === 'GET'
            ? { meta: { existing: 'keep-me' } }
            : { id: 123 },
      } as Response;
    }) as jest.Mock;

    const result = await nudgeGorgiasTicketWidgetRefresh({
      providerBaseUrl: 'https://acme.gorgias.com',
      credentials: { email: 'agent@example.com', api_key: 'key' },
      ticketId: '123',
      reason: 'support_webhook_ingested',
      payload: { claims: 1, orders: 'changed' },
    });

    expect(result).toEqual({ nudged: true, reason: 'updated' });
    expect(calls.map((call) => ({ url: call.url, method: call.method }))).toEqual([
      { url: 'https://acme.gorgias.com/api/tickets/123', method: 'GET' },
      { url: 'https://acme.gorgias.com/api/tickets/123', method: 'PUT' },
    ]);
    expect(calls[1].body).toMatchObject({
      meta: {
        existing: 'keep-me',
        unauth_widget_refresh_reason: 'support_webhook_ingested',
      },
    });
    expect((calls[1].body as { meta: Record<string, unknown> }).meta.unauth_widget_payload_hash)
      .toEqual(expect.any(String));
  });

  it('skips when the ticket already has the same payload hash', async () => {
    const payload = { claims: 1, orders: 'same' };
    const firstCalls: Array<{ body?: unknown }> = [];
    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      firstCalls.push({ body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return {
        ok: true,
        status: 200,
        json: async () => (init?.method === 'GET' ? { meta: {} } : { id: 123 }),
      } as Response;
    }) as jest.Mock;

    await nudgeGorgiasTicketWidgetRefresh({
      providerBaseUrl: 'https://acme.gorgias.com',
      credentials: { email: 'agent@example.com', api_key: 'key' },
      ticketId: '123',
      reason: 'support_webhook_ingested',
      payload,
    });
    const hash = (firstCalls[1].body as { meta: Record<string, unknown> }).meta
      .unauth_widget_payload_hash as string;

    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () =>
        init?.method === 'GET'
          ? { meta: { unauth_widget_payload_hash: hash } }
          : { id: 123 },
    })) as jest.Mock;

    const result = await nudgeGorgiasTicketWidgetRefresh({
      providerBaseUrl: 'https://acme.gorgias.com',
      credentials: { email: 'agent@example.com', api_key: 'key' },
      ticketId: '123',
      reason: 'support_webhook_ingested',
      payload,
    });

    expect(result).toEqual({ nudged: false, reason: 'throttled_or_unchanged' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
