import {
  getOrderByReferenceId,
  verifyShipBobPat,
} from '@/lib/integrations/providers/shipbob';
import { listShipBobOrders } from '@/lib/connectors/providers/shipbob/api';
import { shipbobConnector } from '@/lib/connectors/providers/shipbob';

describe('ShipBob read-only client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('validates channel, location, and order read access in the selected sandbox', async () => {
    const requests: Array<{ url: string; headers: Headers }> = [];
    global.fetch = jest.fn(async (url: string, init: RequestInit) => {
      requests.push({ url, headers: new Headers(init.headers) });
      const body = url.includes('/channel')
        ? [{ id: 42, name: 'Sandbox channel' }]
        : url.includes('/location')
          ? [{ id: 7, name: 'London', is_active: true, is_receiving_enabled: true, is_shipping_enabled: true }]
          : [];
      return { ok: true, status: 200, headers: new Headers(), json: async () => body } as Response;
    }) as typeof fetch;

    await expect(verifyShipBobPat('test-token', true, '42')).resolves.toMatchObject({
      channels: [{ id: '42', name: 'Sandbox channel' }],
      locations: [{ id: '7', name: 'London', active: true }],
    });
    expect(requests).toHaveLength(3);
    expect(requests.every(({ url }) => url.startsWith('https://sandbox-api.shipbob.com/2026-01/'))).toBe(true);
    expect(requests.find(({ url }) => url.includes('/order'))?.url).toContain('Limit=1');
    expect(requests.find(({ url }) => url.includes('/order'))?.headers.get('shipbob_channel_id')).toBe('42');
  });

  it('uses the current ReferenceIds query and maps nested tracking details', async () => {
    let request: { url: string; headers: Headers } | null = null;
    global.fetch = jest.fn(async (url: string, init: RequestInit) => {
      request = { url, headers: new Headers(init.headers) };
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [{
          id: 99,
          reference_id: 'SHOP-1001',
          shipments: [{ id: 2, status: 'Shipped', tracking: { tracking_number: 'TRACK-1', carrier: 'UPS', carrier_service: 'Ground' } }],
          products: [],
        }],
      } as Response;
    }) as typeof fetch;

    const order = await getOrderByReferenceId('SHOP-1001', 'test-token', true, '42');
    expect(request?.url).toContain('ReferenceIds=SHOP-1001');
    expect(request?.url).not.toContain('reference_id=');
    expect(request?.headers.get('shipbob_channel_id')).toBe('42');
    expect(order?.shipments[0]).toMatchObject({ tracking_number: 'TRACK-1', carrier: 'UPS', service: 'Ground' });
  });

  it('rejects invalid tokens without exposing them', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 401, headers: new Headers(), json: async () => ({}) }) as Response) as typeof fetch;
    await expect(verifyShipBobPat('test-token', true)).rejects.toThrow('shipbob_auth_failed');
  });

  it('paginates orders using ShipBob response headers', async () => {
    const requestedUrls: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      requestedUrls.push(url);
      const page = new URL(url).searchParams.get('Page');
      return {
        ok: true,
        status: 200,
        headers: new Headers(page === '1'
          ? {
              'next-page': '/2026-01/order?Limit=100&page=2',
              'page-number': '1',
              'total-pages': '2',
            }
          : {
              'page-number': '2',
              'total-pages': '2',
            }),
        json: async () => page === '1' ? [{ id: 1 }] : [{ id: 2 }],
      } as Response;
    }) as typeof fetch;

    const first = await listShipBobOrders({ accessToken: 'test-token', sandbox: true, channelId: '42' });
    const second = await listShipBobOrders({ accessToken: 'test-token', sandbox: true, channelId: '42' }, first.next);

    expect(first).toEqual({ items: [{ id: 1 }], next: '2' });
    expect(second).toEqual({ items: [{ id: 2 }], next: null });
    expect(requestedUrls[0]).toContain('Limit=100&Page=1');
    expect(requestedUrls[1]).toContain('Limit=100&Page=2');
    expect(requestedUrls.every((url) => !url.includes('Cursor='))).toBe(true);
  });

  it('scopes connector imports to the selected provider account channel', async () => {
    let requestHeaders = new Headers();
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      requestHeaders = new Headers(init.headers);
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'page-number': '1', 'total-pages': '1' }),
        json: async () => [],
      } as Response;
    }) as typeof fetch;

    await shipbobConnector.initialImport({
      client: {} as never,
      merchantId: 'merchant-1',
      connectionId: 'connection-1',
      sourceAccountId: 'account-1',
      credentials: {
        accessToken: 'test-token',
        environment: 'sandbox',
        providerAccountId: '208684',
      },
    }, { phase: 'orders', cursor: null });

    expect(requestHeaders.get('shipbob_channel_id')).toBe('208684');
  });
});
