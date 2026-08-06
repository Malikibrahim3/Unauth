import type { IntegrationProvider, IntegrationCredentialPayload } from '@/lib/integrations/types';

export const fedexProvider: IntegrationProvider = {
  id: 'fedex',
  name: 'FedEx',
  logoSrc: '/providers/fedex.svg',
  category: 'carrier',
  authMode: 'oauth',
  // Matches the executable adapter's own verificationStatus: 'partial'
  // (lib/connectors/providers/carriers.ts) — there is no sync/webhook
  // lifecycle at all, only on-demand evidence fetch for a matching tracking
  // number, and "health" only refreshes an OAuth token rather than probing
  // the tracking API. See docs/audits/unauth-mvp-plus/08-provider-proof-matrix.md.
  buildStatus: 'partial',
  description: 'Direct FedEx tracking, scan history, delivery status, and signature proof documents when account permissions allow.',
  evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature'],
  capabilities: { readTracking: true, readAttachments: true },
  lifecycle: [
    { id: 'connect', applicability: 'applicable', evidence: 'automated_tested', detail: 'OAuth exchange logic is covered with a mocked response by tests/unit/integrations.test.ts; no controlled FedEx account run is recorded.' },
    { id: 'account_verification', applicability: 'applicable', evidence: 'automated_tested', detail: 'Health logic is tested but only refreshes OAuth; it does not probe the tracking/evidence API.' },
    { id: 'initial_import', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Evidence is fetched on demand for a case tracking number, not backfilled.' },
    { id: 'incremental_pull', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No ongoing sync; each fetch is case-triggered.' },
    { id: 'webhook', applicability: 'not_applicable', evidence: 'unavailable', detail: 'FedEx does not push tracking events to Unauth.' },
    { id: 'reconciliation', applicability: 'not_applicable', evidence: 'unavailable', detail: 'No sync lifecycle exists to reconcile.' },
    { id: 'reconnect', applicability: 'applicable', evidence: 'implemented', detail: 'Re-running the OAuth exchange is implemented; controlled reconnect pending.' },
    { id: 'disconnect', applicability: 'applicable', evidence: 'automated_tested', detail: 'Credential removal is covered by tests/unit/connectors/disconnect.test.ts; controlled disconnect pending.' },
    { id: 'freshness_health', applicability: 'applicable', evidence: 'automated_tested', detail: 'Token-refresh-only health logic is covered by tests/unit/liveConnectionVerification.test.ts; a real evidence-API probe is unavailable.' },
    { id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable', detail: 'Read-only tracking/evidence lookup; no write-back to FedEx.' },
  ],
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

  const result = body.output?.completeTrackResults?.[0]?.trackResults?.[0] ?? {};
  const availableImages = Array.isArray(result.availableImages) ? result.availableImages : [];
  const signatureAvailable = availableImages.some((image: unknown) => {
    if (typeof image === 'string') return image.toLowerCase().includes('signature');
    if (!image || typeof image !== 'object') return false;
    const detail = image as Record<string, unknown>;
    return String(detail.type ?? detail.imageType ?? '').toLowerCase().includes('signature');
  });
  if (!signatureAvailable) return body;

  const documentSpec: Record<string, unknown> = {
    trackingNumberInfo: { trackingNumber: input.trackingNumber },
  };
  if (input.credentials.accountNumber) documentSpec.accountNumber = input.credentials.accountNumber;
  const documentResponse = await fetch(`${fedexBaseUrl(String(input.credentials.environment))}/track/v1/trackingdocuments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-locale': 'en_US',
      'x-customer-transaction-id': `unauth-${Date.now()}`,
    },
    body: JSON.stringify({
      trackDocumentDetail: {
        documentType: 'SIGNATURE_PROOF_OF_DELIVERY',
        documentFormat: 'PNG',
      },
      trackDocumentSpecification: [documentSpec],
    }),
    cache: 'no-store',
  });
  const documentBody = await documentResponse.json().catch(() => ({}));
  const documents = documentResponse.ok && Array.isArray(documentBody.output?.document)
    ? documentBody.output.document.filter((document: unknown) => typeof document === 'string' && document.length > 0)
    : [];
  return {
    ...body,
    _unauthProof: {
      signatureDocument: documents[0] ?? null,
      signatureDocumentFormat: documents.length > 0 ? 'PNG' : null,
      signatureRetrieval: documents.length > 0
        ? 'retrieved'
        : documentResponse.ok
          ? 'unavailable'
          : 'failed',
      documentStatus: documentResponse.status,
    },
  };
}
