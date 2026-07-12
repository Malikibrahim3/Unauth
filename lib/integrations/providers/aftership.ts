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

export type AfterShipCheckpoint = {
  message: string;
  location?: string;
  checkpoint_time: string;
  tag?: string;
};

export type AfterShipTracking = {
  tracking_number: string;
  slug: string;
  current_status: string;
  delivery_timestamp?: string;
  last_checkpoint: AfterShipCheckpoint;
  checkpoints: Array<AfterShipCheckpoint & { tag: string }>;
  proof_of_delivery?: {
    url?: string;
    type?: string;
  };
  tracking_source: 'aftership';
  raw: Record<string, any>;
};

function aftershipHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'as-api-key': apiKey,
  };
}

function apiKeyFromEnv(): string {
  const apiKey = process.env.AFTERSHIP_API_KEY?.trim();
  if (!apiKey) throw new Error('aftership_api_key_missing: set AFTERSHIP_API_KEY');
  return apiKey;
}

function cleanCarrierSlug(carrier?: string | null): string | null {
  const value = carrier?.trim().toLowerCase();
  if (!value) return null;
  if (value.includes('ups')) return 'ups';
  if (value.includes('fedex')) return 'fedex';
  if (value.includes('usps')) return 'usps';
  if (value.includes('royal')) return 'royal-mail';
  if (value.includes('evri') || value.includes('hermes')) return 'evri';
  if (value.includes('dpd')) return 'dpd';
  if (value.includes('dhl')) return 'dhl';
  return value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function aftershipErrorCode(body: Record<string, any>): string | null {
  return String(body?.meta?.code ?? body?.code ?? body?.error?.code ?? '').trim() || null;
}

function checkpointMessage(checkpoint: Record<string, any>): string {
  return firstString(checkpoint.message, checkpoint.checkpoint_message, checkpoint.subtag_message, checkpoint.tag) ?? 'Tracking checkpoint';
}

function checkpointLocation(checkpoint: Record<string, any>): string | undefined {
  return firstString(checkpoint.location, checkpoint.city, checkpoint.country_name, checkpoint.country_iso3);
}

function checkpointTime(checkpoint: Record<string, any>): string {
  return firstString(checkpoint.checkpoint_time, checkpoint.created_at, checkpoint.event_date) ?? new Date().toISOString();
}

function proofOfDelivery(tracking: Record<string, any>): AfterShipTracking['proof_of_delivery'] | undefined {
  const pod = tracking.proof_of_delivery && typeof tracking.proof_of_delivery === 'object'
    ? tracking.proof_of_delivery as Record<string, any>
    : tracking.pod && typeof tracking.pod === 'object'
      ? tracking.pod as Record<string, any>
      : null;
  const url = firstString(pod?.url, pod?.image_url, pod?.signature_url, tracking.pod_url, tracking.delivery_photo_url);
  const type = firstString(pod?.type, pod?.kind, tracking.pod_type);
  if (!url && !type) return undefined;
  return { ...(url ? { url } : {}), ...(type ? { type } : {}) };
}

function extractTracking(raw: Record<string, any>): Record<string, any> | null {
  return raw?.data?.tracking ?? raw?.data?.trackings?.[0] ?? raw?.tracking ?? raw?.trackings?.[0] ?? null;
}

function mapAfterShipTracking(raw: Record<string, any>): AfterShipTracking | null {
  const tracking = extractTracking(raw);
  if (!tracking) return null;
  const checkpointsRaw = Array.isArray(tracking.checkpoints) ? tracking.checkpoints : [];
  const checkpoints = checkpointsRaw.map((checkpoint: Record<string, any>) => ({
    message: checkpointMessage(checkpoint),
    ...(checkpointLocation(checkpoint) ? { location: checkpointLocation(checkpoint) } : {}),
    checkpoint_time: checkpointTime(checkpoint),
    tag: firstString(checkpoint.tag, checkpoint.subtag, tracking.tag) ?? 'Unknown',
  }));
  const lastRaw =
    tracking.last_checkpoint && typeof tracking.last_checkpoint === 'object'
      ? tracking.last_checkpoint as Record<string, any>
      : checkpointsRaw[checkpointsRaw.length - 1] ?? {};
  const last = {
    message: checkpointMessage(lastRaw),
    ...(checkpointLocation(lastRaw) ? { location: checkpointLocation(lastRaw) } : {}),
    checkpoint_time: checkpointTime(lastRaw),
    tag: firstString(lastRaw.tag, lastRaw.subtag, tracking.tag),
  };

  return {
    tracking_number: firstString(tracking.tracking_number, tracking.trackingNumber) ?? '',
    slug: firstString(tracking.slug, tracking.courier_slug, tracking.carrier) ?? 'unknown',
    current_status: firstString(tracking.tag, tracking.delivery_status, tracking.status, tracking.subtag_message) ?? 'Unknown',
    ...(firstString(tracking.shipment_delivery_date, tracking.delivered_at, tracking.delivery_timestamp)
      ? { delivery_timestamp: firstString(tracking.shipment_delivery_date, tracking.delivered_at, tracking.delivery_timestamp) }
      : {}),
    last_checkpoint: last,
    checkpoints,
    ...(proofOfDelivery(tracking) ? { proof_of_delivery: proofOfDelivery(tracking) } : {}),
    tracking_source: 'aftership',
    raw: tracking,
  };
}

async function parseAfterShipResponse(res: Response, trackingNumber: string): Promise<AfterShipTracking | null> {
  const body = await res.json().catch(() => ({}));
  const code = aftershipErrorCode(body);
  if (res.status === 404 || code === '4004' || code === '4003') return null;
  if (res.status === 401 || res.status === 403) {
    throw new Error('aftership_auth_failed: check AFTERSHIP_API_KEY');
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    console.warn('aftership_rate_limited', { trackingNumber, retryAfter });
    throw new Error(`aftership_rate_limited${retryAfter ? `: retry after ${retryAfter}s` : ''}`);
  }
  if (!res.ok) {
    throw new Error(`aftership_tracking_fetch_failed: ${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  }
  return mapAfterShipTracking(body);
}

export async function verifyAfterShipApiKey(apiKey: string): Promise<void> {
  const res = await fetch(`${AFTERSHIP_API_BASE_URL}/trackings?limit=1`, {
    headers: aftershipHeaders(apiKey),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`aftership_verify_failed: ${res.status} ${body.slice(0, 240)}`);
  }
}

export async function getTracking(
  trackingNumber: string,
  carrier?: string,
  apiKey?: string,
): Promise<AfterShipTracking | null> {
  const key = apiKey ?? apiKeyFromEnv();
  const number = trackingNumber.trim();
  if (!number) return null;
  const slug = cleanCarrierSlug(carrier);
  async function lookup(includeSlug: boolean) {
    const search = new URLSearchParams();
    search.append('tracking_numbers[]', number);
    if (includeSlug && slug) search.set('slug', slug);
    const res = await fetch(`${AFTERSHIP_API_BASE_URL}/trackings?${search.toString()}`, {
      headers: aftershipHeaders(key),
      cache: 'no-store',
    });
    return parseAfterShipResponse(res, number);
  }
  const withSlug = await lookup(Boolean(slug));
  if (withSlug || !slug) return withSlug;
  return lookup(false);
}

export async function getLastCheckpoint(
  trackingNumber: string,
  carrier?: string,
  apiKey?: string,
): Promise<AfterShipCheckpoint | null> {
  const tracking = await getTracking(trackingNumber, carrier, apiKey ?? apiKeyFromEnv());
  return tracking?.last_checkpoint ?? null;
}

export async function fetchAfterShipTracking(input: {
  apiKey: string;
  trackingNumber: string;
  slug?: string | null;
}): Promise<AfterShipTrackingPayload> {
  const tracking = await getTracking(input.trackingNumber, input.slug ?? undefined, input.apiKey);
  if (!tracking) {
    throw new Error('aftership_tracking_not_found');
  }
  return tracking.raw;
}
