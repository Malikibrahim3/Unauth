import type { IntegrationProvider, IntegrationCredentialPayload } from '@/lib/integrations/types';

export const fedexProvider: IntegrationProvider = {
  id: 'fedex',
  name: 'FedEx',
  logoSrc: '/integrations/fedex.svg',
  category: 'carrier',
  authMode: 'oauth',
  buildStatus: 'live',
  description: 'Direct FedEx tracking, scan history, delivery status, and signature proof documents when account permissions allow.',
  evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status', 'delivery_photo', 'signature'],
  capabilities: { readTracking: true, readAttachments: true },
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
