import { requestedShipBobEnvironment, shipBobEndpoints, shipBobEnvironmentFromCredentials } from '@/lib/integrations/providers/shipbobEnvironment';
import { safeShipBobAuditMetadata } from '@/lib/integrations/providers/shipbobAudit';

describe('ShipBob per-connection environment', () => {
  it('defaults to production when the merchant does not request an environment', () => {
    expect(requestedShipBobEnvironment({ requested: null, nodeEnv: 'production' })).toBe('production');
  });

  it('preserves a merchant connection sandbox choice independently of deployment environment', () => {
    expect(requestedShipBobEnvironment({ requested: 'sandbox', nodeEnv: 'development' })).toBe('sandbox');
    expect(requestedShipBobEnvironment({ requested: 'sandbox', nodeEnv: 'production' })).toBe('sandbox');
    expect(requestedShipBobEnvironment({ requested: 'sandbox', nodeEnv: 'production', testMode: true })).toBe('sandbox');
  });

  it('selects disjoint endpoint families', () => {
    expect(shipBobEndpoints('sandbox')).toEqual({ authorizationHost: 'https://authstage.shipbob.com', apiBaseUrl: 'https://sandbox-api.shipbob.com/2026-01' });
    expect(shipBobEndpoints('production')).toEqual({ authorizationHost: 'https://auth.shipbob.com', apiBaseUrl: 'https://api.shipbob.com/2026-01' });
  });

  it('preserves explicit sandbox credentials and defaults legacy credentials safely', () => {
    expect(shipBobEnvironmentFromCredentials({ environment: 'sandbox' })).toBe('sandbox');
    expect(shipBobEnvironmentFromCredentials({ sandbox: true })).toBe('sandbox');
    expect(shipBobEnvironmentFromCredentials({})).toBe('production');
  });
});

describe('ShipBob audit metadata', () => {
  it('excludes all secret-bearing fields', () => {
    expect(safeShipBobAuditMetadata({ accessToken: 'a', refresh_token: 'r', clientSecret: 'c', authorizationCode: 'x', webhookSecret: 'w', recordCount: 4, failureCategory: 'rate_limit' }))
      .toEqual({ recordCount: 4, failureCategory: 'rate_limit' });
  });

  it('uses an allowlist and never preserves free-form failure detail', () => {
    expect(safeShipBobAuditMetadata({
      note: 'token=do-not-store',
      failureCategory: 'Provider said token=do-not-store',
      recordCount: 2,
    })).toEqual({ failureCategory: 'integration_error', recordCount: 2 });
  });
});
