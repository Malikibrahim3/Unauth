import { NextRequest } from 'next/server';

jest.mock('@/lib/utils/env', () => ({ env: { CRON_SECRET: 'test-cron-secret' } }));
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/lib/reconciliation/reconcileMerchant', () => ({ reconcileMerchant: jest.fn() }));

import { createAdminClient } from '@/lib/supabase/server';
import { reconcileMerchant } from '@/lib/reconciliation/reconcileMerchant';
import { GET } from '@/app/api/cron/reconcile/route';

const MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';

function merchantClient(rows: Array<{ id: string }>) {
  const query: Record<string, jest.Mock | ((resolve: (value: unknown) => unknown) => unknown)> = {};
  for (const method of ['select', 'order', 'limit', 'eq', 'gt']) {
    query[method] = jest.fn(() => query);
  }
  query.then = (resolve) => resolve({ data: rows, error: null });
  return { client: { from: jest.fn(() => query) }, query };
}

function request(query = '', authorization?: string) {
  return new NextRequest(`http://localhost/api/cron/reconcile${query}`, {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('GET /api/cron/reconcile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects missing and invalid authorization before opening an admin client', async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request('', 'Bearer invalid'))).status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('runs a merchant-scoped sweep and reports a successful aggregate', async () => {
    const { client, query } = merchantClient([{ id: MERCHANT_ID }]);
    (createAdminClient as jest.Mock).mockReturnValue(client);
    (reconcileMerchant as jest.Mock).mockResolvedValue({
      merchantId: MERCHANT_ID,
      detectors: [],
      exceptionsRaised: 0,
      failures: [],
    });

    const response = await GET(request(`?merchantId=${MERCHANT_ID}`, 'Bearer test-cron-secret'));

    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith('id', MERCHANT_ID);
    expect(await response.json()).toMatchObject({
      merchantsSwept: 1,
      exceptionsRaised: 0,
      failureCount: 0,
      nextCursor: null,
    });
  });

  it('applies a resume cursor for an unscoped batch', async () => {
    const { client, query } = merchantClient([{ id: MERCHANT_ID }]);
    (createAdminClient as jest.Mock).mockReturnValue(client);
    (reconcileMerchant as jest.Mock).mockResolvedValue({
      merchantId: MERCHANT_ID,
      detectors: [],
      exceptionsRaised: 0,
      failures: [],
    });

    const response = await GET(request('?cursor=merchant-before', 'Bearer test-cron-secret'));

    expect(response.status).toBe(200);
    expect(query.gt).toHaveBeenCalledWith('id', 'merchant-before');
  });

  it('returns a failing status when a detector fails so the cron cannot look healthy', async () => {
    const { client } = merchantClient([{ id: MERCHANT_ID }]);
    (createAdminClient as jest.Mock).mockReturnValue(client);
    (reconcileMerchant as jest.Mock).mockResolvedValue({
      merchantId: MERCHANT_ID,
      detectors: [],
      exceptionsRaised: 0,
      failures: [{ detector: 'unmatched_refunds', message: 'source read unavailable' }],
    });

    const response = await GET(request(`?merchantId=${MERCHANT_ID}`, 'Bearer test-cron-secret'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ failureCount: 1, exceptionsRaised: 0 });
    expect(body.failures[0]).toMatchObject({ merchantId: MERCHANT_ID, detector: 'unmatched_refunds' });
  });
});
