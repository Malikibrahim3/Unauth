jest.mock('@/lib/utils/env', () => ({
  env: { NEXT_PUBLIC_APP_URL: 'https://app.unauth.test' },
}));

import { registerGorgiasSidebarWidget } from '@/lib/support/gorgias/registerSidebarWidget';

type FetchCall = { url: string; method: string };

function installFetchMock(): FetchCall[] {
  const calls: FetchCall[] = [];
  const mock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method });

    if (method === 'POST' && url.endsWith('/integrations')) {
      return Promise.resolve(new Response(JSON.stringify({ id: 555 }), { status: 200 }));
    }
    if (method === 'POST' && url.endsWith('/widgets')) {
      return Promise.resolve(new Response(JSON.stringify({ id: 777 }), { status: 200 }));
    }
    // DELETE calls return 204 No Content
    return Promise.resolve(new Response(null, { status: 204 }));
  });
  (global as unknown as { fetch: typeof fetch }).fetch = mock as unknown as typeof fetch;
  return calls;
}

const baseInput = {
  providerBaseUrl: 'https://acme.gorgias.com',
  credentials: { email: 'ops@acme.com', api_key: 'key-123' },
  widgetToken: 'unauth_wt_test',
};

describe('registerGorgiasSidebarWidget', () => {
  it('creates a new integration + widget and deletes the previous ones', async () => {
    const calls = installFetchMock();

    const result = await registerGorgiasSidebarWidget({
      ...baseInput,
      previous: { integrationId: 101, widgetId: 202 },
    });

    expect(result).toEqual({ integrationId: 555, widgetId: 777 });

    // New resources created before the old ones are deleted.
    expect(calls).toEqual([
      { url: 'https://acme.gorgias.com/api/integrations', method: 'POST' },
      { url: 'https://acme.gorgias.com/api/widgets', method: 'POST' },
      { url: 'https://acme.gorgias.com/api/widgets/202', method: 'DELETE' },
      { url: 'https://acme.gorgias.com/api/integrations/101', method: 'DELETE' },
    ]);
  });

  it('does not issue DELETE calls when there is no previous widget', async () => {
    const calls = installFetchMock();

    await registerGorgiasSidebarWidget({ ...baseInput, previous: null });

    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('still returns the new widget when cleanup of the previous one fails', async () => {
    const calls: FetchCall[] = [];
    const mock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method });
      if (method === 'POST' && url.endsWith('/integrations')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
      }
      if (method === 'POST' && url.endsWith('/widgets')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 2 }), { status: 200 }));
      }
      return Promise.reject(new Error('network down'));
    });
    (global as unknown as { fetch: typeof fetch }).fetch = mock as unknown as typeof fetch;

    const result = await registerGorgiasSidebarWidget({
      ...baseInput,
      previous: { integrationId: 9, widgetId: 8 },
    });

    expect(result).toEqual({ integrationId: 1, widgetId: 2 });
  });
});
