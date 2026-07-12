import {
  getOrderByReferenceId,
  verifyShipBobPat,
} from '@/lib/integrations/providers/shipbob';

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
});
