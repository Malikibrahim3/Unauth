import type { IntegrationProvider } from '@/lib/integrations/types';

export const AFTERSHIP_API_BASE_URL = 'https://api.aftership.com/tracking/2026-01';

export const aftershipProvider: IntegrationProvider = {
  id: 'aftership',
  name: 'AfterShip',
  category: 'tracking',
  authMode: 'api_key',
  buildStatus: 'live',
  description: 'Tracking status, scan history, exceptions, and delivery dates. Does not provide delivery photos, signatures, or GPS.',
  evidenceCapabilities: ['tracking_number', 'tracking_events', 'delivery_status'],
  capabilities: { readTracking: true },
};

export type AfterShipTrackingPayload = Record<string, any>;

function aftershipHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'as-api-key': apiKey,
  };
}

export async function verifyAfterShipApiKey(apiKey: string): Promise<void> {
  const res = await fetch(`${AFTERSHIP_API_BASE_URL}/couriers?limit=1`, {
    headers: aftershipHeaders(apiKey),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`aftership_verify_failed: ${res.status} ${body.slice(0, 240)}`);
  }
}

export async function fetchAfterShipTracking(input: {
  apiKey: string;
  trackingNumber: string;
  slug?: string | null;
}): Promise<AfterShipTrackingPayload> {
  const number = input.trackingNumber.trim();
  const searchUrl = `${AFTERSHIP_API_BASE_URL}/trackings?tracking_numbers%5B%5D=${encodeURIComponent(number)}`;
  const searchRes = await fetch(searchUrl, {
    headers: aftershipHeaders(input.apiKey),
    cache: 'no-store',
  });
  if (searchRes.ok) {
    const body = await searchRes.json();
    const tracking = body?.data?.trackings?.[0] ?? body?.trackings?.[0] ?? null;
    if (tracking) return tracking;
  }

  const createRes = await fetch(`${AFTERSHIP_API_BASE_URL}/trackings`, {
    method: 'POST',
    headers: aftershipHeaders(input.apiKey),
    body: JSON.stringify({
      tracking: {
        tracking_number: number,
        slug: input.slug ?? undefined,
      },
    }),
    cache: 'no-store',
  });
  const createBody = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(`aftership_tracking_fetch_failed: ${createRes.status} ${JSON.stringify(createBody).slice(0, 400)}`);
  }
  return createBody?.data?.tracking ?? createBody?.tracking ?? createBody;
}
