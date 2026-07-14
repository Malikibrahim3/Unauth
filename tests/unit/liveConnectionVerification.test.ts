import {
  persistLiveVerification,
  verifyMerchantIntegrationConnection,
  type MerchantIntegrationVerificationRow,
} from '@/lib/connections/liveVerification';

function row(
  providerId: MerchantIntegrationVerificationRow['provider_id'],
  overrides: Partial<MerchantIntegrationVerificationRow> = {},
): MerchantIntegrationVerificationRow {
  return {
    id: `connection-${providerId}`,
    merchant_id: 'merchant-a',
    provider_id: providerId,
    provider_account_id: `account-${providerId}`,
    environment: 'production',
    status: 'connected',
    ...overrides,
  };
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    refreshCarrierCredentials: jest.fn().mockResolvedValue({ accessToken: 'opaque' }),
    getIntegrationCredential: jest.fn().mockResolvedValue({
      apiKey: 'opaque',
      environment: 'production',
    }),
    refreshShipBobCredentialsIfNeeded: jest.fn().mockResolvedValue({
      accessToken: 'opaque',
      environment: 'production',
    }),
    verifyShipBobPat: jest.fn().mockResolvedValue({
      channels: [{ id: 'account-shipbob', name: 'Merchant A' }],
      locations: [],
    }),
    ...overrides,
  };
}

describe('merchant integration live verification', () => {
  it('refreshes a carrier credential for the exact merchant connection', async () => {
    const deps = dependencies();
    const result = await verifyMerchantIntegrationConnection(
      {} as never,
      row('ups'),
      deps as never,
    );

    expect(result).toEqual({ status: 'verified' });
    expect(deps.refreshCarrierCredentials).toHaveBeenCalledWith({}, {
      merchantId: 'merchant-a',
      connectionId: 'connection-ups',
      providerId: 'ups',
    });
  });

  it('verifies the selected ShipBob account and environment only', async () => {
    const deps = dependencies();
    const result = await verifyMerchantIntegrationConnection(
      {} as never,
      row('shipbob'),
      deps as never,
    );

    expect(result).toEqual({ status: 'verified' });
    expect(deps.verifyShipBobPat).toHaveBeenCalledWith('opaque', false, 'account-shipbob');
  });

  it('fails when the selected ShipBob account is no longer discoverable', async () => {
    const deps = dependencies({
      verifyShipBobPat: jest.fn().mockResolvedValue({
        channels: [{ id: 'someone-elses-account', name: 'Other' }],
        locations: [],
      }),
    });
    const result = await verifyMerchantIntegrationConnection(
      {} as never,
      row('shipbob'),
      deps as never,
    );

    expect(result).toEqual({ status: 'failed', reason: 'provider_account_unavailable' });
  });

  it('classifies a provider rejection without persisting raw response detail', async () => {
    const deps = dependencies({
      refreshCarrierCredentials: jest.fn().mockRejectedValue(
        new Error('fedex_oauth_failed: 401 client_secret=do-not-expose'),
      ),
    });
    const result = await verifyMerchantIntegrationConnection(
      {} as never,
      row('fedex'),
      deps as never,
    );

    expect(result).toEqual({ status: 'failed', reason: 'credentials_revoked' });
    expect(JSON.stringify(result)).not.toContain('do-not-expose');
  });

  it('persists a result with both connection and merchant predicates', async () => {
    const predicates: Array<[string, string]> = [];
    const query: Record<string, unknown> = { error: null };
    query.update = jest.fn(() => query);
    query.eq = jest.fn((column: string, value: string) => {
      predicates.push([column, value]);
      return query;
    });
    const client = { from: jest.fn(() => query) };

    await persistLiveVerification(
      client as never,
      'merchant_integrations',
      'merchant-a',
      'connection-ups',
      'connected',
      { status: 'verified' },
      '2026-07-14T20:00:00.000Z',
    );

    expect(predicates).toEqual([
      ['id', 'connection-ups'],
      ['merchant_id', 'merchant-a'],
    ]);
  });

  it('degrades safely during the additive verification-column rollout only', async () => {
    const query: Record<string, unknown> = {
      error: {
        code: 'PGRST204',
        message: "Could not find the 'last_verification_error' column in the schema cache",
      },
    };
    query.update = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    const client = { from: jest.fn(() => query) };

    await expect(persistLiveVerification(
      client as never,
      'merchant_integrations',
      'merchant-a',
      'connection-shipbob',
      'connected',
      { status: 'verified' },
    )).resolves.toBeUndefined();

    (query as { error: { code: string; message: string } }).error = {
      code: '42501',
      message: 'permission denied',
    };
    await expect(persistLiveVerification(
      client as never,
      'merchant_integrations',
      'merchant-a',
      'connection-shipbob',
      'connected',
      { status: 'verified' },
    )).rejects.toThrow('persist_live_verification_failed');
  });
});
