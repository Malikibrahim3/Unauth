import type { IntegrationProvider, IntegrationCredentialPayload } from '@/lib/integrations/types';

export const upsProvider: IntegrationProvider = {
  id: 'ups',
  name: 'UPS',
  logoSrc: '/integrations/ups.svg',
  category: 'carrier',
  authMode: 'oauth',
  buildStatus: 'live',
  description: 'Direct UPS tracking, scan history, delivery status, signature, and photo proof when available.',
  evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature'],
  capabilities: { readTracking: true, readAttachments: true },
};

function upsBaseUrl(environment: string | undefined): string {
  return environment === 'sandbox' ? 'https://wwwcie.ups.com' : 'https://onlinetools.ups.com';
}

export async function exchangeUpsClientCredentials(input: {
  clientId: string;
  clientSecret: string;
  environment?: 'sandbox' | 'production';
}): Promise<{ accessToken: string; expiresAt: string | null }> {
  const basic = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString('base64');
  const res = await fetch(`${upsBaseUrl(input.environment)}/security/v1/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`ups_oauth_failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  const expiresIn = Number(body.expires_in);
  return {
    accessToken: String(body.access_token),
    expiresAt: Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

export async function fetchUpsDeliveryProof(input: {
  credentials: IntegrationCredentialPayload;
  trackingNumber: string;
}): Promise<Record<string, any>> {
  const token = String(input.credentials.accessToken ?? '');
  if (!token) throw new Error('ups_access_token_missing');
  const url = `${upsBaseUrl(String(input.credentials.environment))}/api/track/v1/details/${encodeURIComponent(input.trackingNumber)}?locale=en_US&returnSignature=true`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      transId: `unauth-${Date.now()}`,
      transactionSrc: 'unauth',
    },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`ups_proof_fetch_failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}
