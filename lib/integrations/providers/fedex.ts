import type { IntegrationProvider, IntegrationCredentialPayload } from '@/lib/integrations/types';

export const fedexProvider: IntegrationProvider = {
  id: 'fedex',
  name: 'FedEx (direct)',
  category: 'carrier',
  authMode: 'oauth',
  buildStatus: 'live',
  description: 'Attempts to retrieve FedEx signature or delivery photo when captured for the shipment.',
  evidenceCapabilities: ['delivery_photo', 'signature'],
  capabilities: { readAttachments: true },
};

function fedexBaseUrl(environment: string | undefined): string {
  return environment === 'sandbox' ? 'https://apis-sandbox.fedex.com' : 'https://apis.fedex.com';
}

export async function exchangeFedExClientCredentials(input: {
  clientId: string;
  clientSecret: string;
  environment?: 'sandbox' | 'production';
}): Promise<{ accessToken: string; expiresAt: string | null }> {
  const res = await fetch(`${fedexBaseUrl(input.environment)}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: input.clientId,
      client_secret: input.clientSecret,
    }).toString(),
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`fedex_oauth_failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  const expiresIn = Number(body.expires_in);
  return {
    accessToken: String(body.access_token),
    expiresAt: Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

export async function fetchFedExDeliveryProof(input: {
  credentials: IntegrationCredentialPayload;
  trackingNumber: string;
}): Promise<Record<string, any>> {
  const token = String(input.credentials.accessToken ?? '');
  if (!token) throw new Error('fedex_access_token_missing');
  const res = await fetch(`${fedexBaseUrl(String(input.credentials.environment))}/track/v1/trackingnumbers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-locale': 'en_US',
    },
    body: JSON.stringify({
      includeDetailedScans: true,
      trackingInfo: [
        {
          trackingNumberInfo: {
            trackingNumber: input.trackingNumber,
          },
        },
      ],
    }),
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`fedex_proof_fetch_failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}
