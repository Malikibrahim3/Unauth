import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({ createServiceClient: jest.fn() }));
jest.mock('@/lib/checkout/collectorToken', () => ({ mintCollectorToken: jest.fn(() => 'token-1') }));
jest.mock('@/lib/utils/appUrl', () => ({ getAppUrl: jest.fn(() => 'https://app.unauth.co') }));

import { createServiceClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/checkout-signals/config/route';

function connectionClient(data: unknown) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data, error: null }),
  };
  return { from: jest.fn(() => builder) };
}

describe('checkout collector configuration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects malformed public store identifiers without a database lookup', async () => {
    const response = await GET(new NextRequest(
      'http://localhost/api/checkout-signals/config?platform=shopify&store=%20',
    ));
    expect(response.status).toBe(400);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('resolves only an active platform/store connection and returns a short-lived token in the body', async () => {
    const client = connectionClient({ merchant_id: 'merchant-1' });
    (createServiceClient as jest.Mock).mockReturnValue(client);

    const response = await GET(new NextRequest(
      'http://localhost/api/checkout-signals/config?platform=bigcommerce&store=abc123',
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    await expect(response.json()).resolves.toEqual({
      merchantId: 'merchant-1',
      platform: 'bigcommerce',
      collectorToken: 'token-1',
      endpoint: 'https://app.unauth.co/api/checkout-signals/ingest',
    });
  });
});
