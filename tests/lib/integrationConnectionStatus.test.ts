import { fetchIntegrationConnectionStatus } from '@/components/settings/fetchIntegrationConnectionStatus';

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  }));
}

function installFetch(verifyStatus: number, verifyBody: unknown = {}) {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/settings/gorgias/support-connection') {
      return json({ connection: { status: 'active' }, link: { helpdeskLinked: true, state: 'connected' } });
    }
    if (url === '/api/shopify/status') return json({ connected: true, shopDomain: 'test.myshopify.com' });
    if (url === '/api/settings/gorgias/support-connection/verify' || url === '/api/shopify/verify') {
      return json(verifyBody, verifyStatus);
    }
    return json({ connected: false });
  }) as jest.Mock;
}

describe('integration connection verification status', () => {
  afterEach(() => jest.restoreAllMocks());

  it('fails closed when live verification endpoints error', async () => {
    installFetch(500, { error: 'verification_unavailable' });
    const status = await fetchIntegrationConnectionStatus();
    expect(status.shopify).toMatchObject({ connected: false, connectionIssue: true });
    expect(status.gorgias).toMatchObject({ connected: false, connectionIssue: true });
  });

  it('fails closed when live verification is inconclusive', async () => {
    installFetch(200, { inconclusive: true });
    const status = await fetchIntegrationConnectionStatus();
    expect(status.shopify.connected).toBe(false);
    expect(status.gorgias.connected).toBe(false);
  });

  it('reports connected only after positive live verification', async () => {
    installFetch(200, { ok: true });
    const status = await fetchIntegrationConnectionStatus();
    expect(status.shopify).toMatchObject({ connected: true, connectionIssue: false });
    expect(status.gorgias).toMatchObject({ connected: true, connectionIssue: false });
  });
});
