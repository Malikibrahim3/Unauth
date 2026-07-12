export type ShipBobEnvironment = 'sandbox' | 'production';

export const SHIPBOB_ENDPOINTS: Record<ShipBobEnvironment, { authorizationHost: string; apiBaseUrl: string }> = {
  sandbox: { authorizationHost: 'https://authstage.shipbob.com', apiBaseUrl: 'https://sandbox-api.shipbob.com/2026-01' },
  production: { authorizationHost: 'https://auth.shipbob.com', apiBaseUrl: 'https://api.shipbob.com/2026-01' },
};

export function shipBobEndpoints(environment: ShipBobEnvironment) {
  return SHIPBOB_ENDPOINTS[environment];
}

export function shipBobEnvironmentFromCredentials(payload: Record<string, unknown>): ShipBobEnvironment {
  return payload.environment === 'sandbox' || payload.sandbox === true ? 'sandbox' : 'production';
}

export function requestedShipBobEnvironment(input: {
  requested: string | null;
  nodeEnv?: string;
  testMode?: boolean;
}): ShipBobEnvironment {
  if (input.requested === 'sandbox' && (input.nodeEnv !== 'production' || input.testMode === true)) return 'sandbox';
  return 'production';
}
