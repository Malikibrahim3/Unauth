const listShipBobSubscriptions = jest.fn();
const deleteShipBobSubscription = jest.fn();

jest.mock('@/lib/connectors/providers/shipbob/api', () => ({
  listShipBobSubscriptions: (...args: unknown[]) => listShipBobSubscriptions(...args),
  deleteShipBobSubscription: (...args: unknown[]) => deleteShipBobSubscription(...args),
  listShipBobLocations: jest.fn(),
  listShipBobOrders: jest.fn(),
  listShipBobReturns: jest.fn(),
  shipBobToken: (credentials: { accessToken?: string; apiKey?: string }) =>
    credentials.accessToken ?? credentials.apiKey ?? null,
}));

jest.mock('@/lib/integrations/providers/shipbob', () => ({
  verifyShipBobPat: jest.fn(),
}));

jest.mock('@/lib/utils/appUrl', () => ({
  getAppUrl: () => 'https://unauth.example',
}));

import { shipbobConnector } from '@/lib/connectors/providers/shipbob';

describe('ShipBob disconnect webhook isolation', () => {
  beforeEach(() => {
    listShipBobSubscriptions.mockReset();
    deleteShipBobSubscription.mockReset();
  });

  it('deletes only the subscription for the disconnected connection', async () => {
    listShipBobSubscriptions.mockResolvedValue({
      items: [
        {
          id: 'subscription-a',
          url: 'https://unauth.example/api/integrations/shipbob/webhook?connectionId=connection-a',
          topics: [],
        },
        {
          id: 'subscription-c',
          url: 'https://unauth.example/api/integrations/shipbob/webhook?connectionId=connection-c',
          topics: [],
        },
        {
          id: 'external-subscription',
          url: 'https://other.example/webhook',
          topics: [],
        },
      ],
      next: null,
    });

    await shipbobConnector.disconnect({
      client: {} as never,
      merchantId: 'merchant-c',
      connectionId: 'connection-c',
      credentials: { accessToken: 'test-token', environment: 'sandbox' },
    });

    expect(deleteShipBobSubscription).toHaveBeenCalledTimes(1);
    expect(deleteShipBobSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'test-token', sandbox: true }),
      'subscription-c',
    );
  });

  it('does not delete any subscription without a connection ID', async () => {
    await expect(shipbobConnector.disconnect({
      client: {} as never,
      merchantId: 'merchant-c',
      credentials: { accessToken: 'test-token', environment: 'sandbox' },
    })).resolves.toEqual({ ok: true, message: 'shipbob_connection_id_missing' });

    expect(listShipBobSubscriptions).not.toHaveBeenCalled();
    expect(deleteShipBobSubscription).not.toHaveBeenCalled();
  });
});
