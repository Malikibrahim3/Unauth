import type { IntegrationProvider, IntegrationCredentialPayload } from '@/lib/integrations/types';

export const upsProvider: IntegrationProvider = {
  id: 'ups',
  name: 'UPS',
  logoSrc: '/providers/ups.svg',
  category: 'carrier',
  authMode: 'oauth',
  // Matches the executable adapter's own verificationStatus: 'partial'
  // (lib/connectors/providers/carriers.ts) — there is no sync/webhook
  // lifecycle at all, only on-demand evidence fetch for a matching tracking
  // number, and "health" only refreshes an OAuth token rather than probing
  // the tracking API. See docs/audits/unauth-mvp-plus/08-provider-proof-matrix.md.
  codeMaturity: 'partial',
  description: 'Direct UPS tracking, scan history, delivery status, signature, and photo proof when available.',
  evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature'],
  capabilities: { readTracking: true, readAttachments: true },
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'automated_tested', detail: 'OAuth exchange logic is covered with a mocked response by tests/unit/integrations.test.ts; no controlled UPS account run is recorded.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'automated_tested', detail: 'Health logic is tested but only refreshes OAuth; it does not probe the tracking/evidence API.' },
    { id: 'initial_import', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Evidence is fetched on demand for a case tracking number, not backfilled.' },
    { id: 'incremental_pull', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No ongoing sync; each fetch is case-triggered.' },
    { id: 'webhook', applicability: 'not_applicable', evidence: 'unavailable', detail: 'UPS does not push tracking events to Unauth.' },
    { id: 'reconciliation', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No sync lifecycle exists to reconcile.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'implemented', detail: 'Re-running the OAuth exchange is implemented; controlled reconnect pending.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Credential removal is covered by tests/unit/connectors/disconnect.test.ts; controlled disconnect pending.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'automated_tested', detail: 'Token-refresh-only health logic is covered by tests/unit/liveConnectionVerification.test.ts; a real evidence-API probe is unavailable.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Read-only tracking/evidence lookup; no write-back to UPS.' },
  ],
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
