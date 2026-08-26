import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import { buildDeliveryFromFulfillment } from '@/lib/claims/decision/deliveryEvidence';

export type TrackingGapReason =
  | 'no_tracking_number'
  | 'provider_not_connected'
  | 'tracking_not_found'
  | 'carrier_unsupported'
  | null;

export type TrackingEvidenceRow = {
  evidence_type: string;
  summary: string;
  value: unknown;
  occurred_at: string | null;
  raw_reference: string | null;
  source_provider: string;
};

export type TrackingProviderSlice = {
  provider: 'ups' | 'fedex' | null;
  connected: boolean;
  status: string | null;
  tag: string | null;
  scanCount: number;
  lastScanAt: string | null;
  exceptionCount: number;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingFound: boolean;
  gap: TrackingGapReason;
  deliveryPhotoAvailable: boolean;
  signatureAvailable: boolean;
  proofOfDeliveryAvailable: boolean;
  gpsSupported: boolean;
};

type DeliverySlice = NonNullable<ClaimDecisionContext['delivery']>;

function parseNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDate(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  return null;
}

function parseCarrierStatus(tag: string | null): string {
  if (!tag) return 'unknown';
  const normalized = tag.toLowerCase();
  if (normalized.includes('deliver')) return 'delivered';
  if (normalized.includes('transit') || normalized.includes('intransit')) return 'in_transit';
  if (normalized.includes('exception') || normalized.includes('failed')) return 'exception';
  if (normalized.includes('pending') || normalized.includes('info')) return 'pending';
  return normalized;
}

export function emptyTrackingProviderSlice(provider: TrackingProviderSlice['provider'] = null): TrackingProviderSlice {
  return {
    provider,
    connected: false,
    status: null,
    tag: null,
    scanCount: 0,
    lastScanAt: null,
    exceptionCount: 0,
    estimatedDeliveryAt: null,
    deliveredAt: null,
    carrier: null,
    trackingNumber: null,
    trackingFound: false,
    gap: null,
    deliveryPhotoAvailable: false,
    signatureAvailable: false,
    proofOfDeliveryAvailable: false,
    gpsSupported: false,
  };
}

export function parseCarrierEvidenceRows(
  rows: TrackingEvidenceRow[],
  input: {
    provider: 'ups' | 'fedex' | null;
    providerConnected: boolean;
    trackingNumber: string | null;
  },
): TrackingProviderSlice {
  const slice = emptyTrackingProviderSlice(input.provider);
  slice.connected = input.providerConnected;
  slice.provider = input.provider;
  slice.trackingNumber = input.trackingNumber;

  if (!input.trackingNumber) {
    slice.gap = 'no_tracking_number';
    return slice;
  }
  if (!input.provider) {
    slice.gap = 'carrier_unsupported';
    return slice;
  }
  if (!input.providerConnected) {
    slice.gap = 'provider_not_connected';
    return slice;
  }

  const statusRow = rows.find((row) => row.evidence_type === 'delivery_status');
  const eventsRow = rows.find((row) => row.evidence_type === 'tracking_events');
  const trackingRow = rows.find((row) => row.evidence_type === 'tracking_number');
  const photoRow = rows.find((row) => row.evidence_type === 'delivery_photo');
  const signatureRow = rows.find((row) => row.evidence_type === 'signature');
  const proofRow = rows.find((row) => row.evidence_type === 'proof_of_delivery');
  const gpsRow = rows.find((row) => row.evidence_type === 'gps' || row.evidence_type === 'gps_coordinates');

  if (!statusRow && !eventsRow && !trackingRow) {
    slice.gap = 'tracking_not_found';
    return slice;
  }

  slice.trackingFound = true;
  slice.status = typeof statusRow?.value === 'string' ? statusRow.value : statusRow?.summary ?? null;
  slice.tag = slice.status;
  slice.scanCount = parseNumber(eventsRow?.value) ?? 0;
  slice.lastScanAt = parseDate(statusRow?.occurred_at, eventsRow?.occurred_at);
  slice.deliveredAt = parseDate(statusRow?.occurred_at);
  slice.estimatedDeliveryAt = null;

  const summary = eventsRow?.summary ?? '';
  const exceptionMatch = summary.match(/(\d+)\s+exception event/i);
  slice.exceptionCount = exceptionMatch ? Number(exceptionMatch[1]) : 0;
  if (slice.exceptionCount === 0 && /exception/i.test(summary)) {
    slice.exceptionCount = 1;
  }

  if (trackingRow?.summary) {
    const parts = trackingRow.summary.split(' ');
    slice.carrier = parts.length > 1 ? parts[0] : null;
  }

  slice.deliveryPhotoAvailable = photoRow?.value != null;
  slice.signatureAvailable = signatureRow?.value != null;
  slice.proofOfDeliveryAvailable = proofRow?.value != null;
  slice.gpsSupported = gpsRow?.value != null;
  return slice;
}

export function mergeDeliveryWithTrackingEvidence(
  fulfillment: {
    status: string | null;
    shipment_status: string | null;
    tracking_company: string | null;
    tracking_number: string | null;
    occurred_at: string | null;
  } | null,
  tracking: TrackingProviderSlice,
): DeliverySlice | null {
  const base = fulfillment ? buildDeliveryFromFulfillment(fulfillment) : {
    status: 'unknown',
    carrier: null,
    trackingNumber: null,
    trackingUrl: null,
    deliveredAt: null,
    hasTracking: false,
    hasProofOfDelivery: false,
    daysSinceDelivery: null,
    trackingProvider: null,
    trackingProviderConnected: false,
    carrierDirectConnected: false,
    scanCount: 0,
    lastScanAt: null,
    exceptionCount: 0,
    estimatedDeliveryAt: null,
    trackingGap: null,
    deliveryPhotoAvailable: false,
    deliveryPhotoFinding: null,
    deliveryPhotoFindingRationale: null,
    deliveryPhotoFindingAt: null,
    signatureAvailable: false,
    gpsSupported: false,
  };

  const trackingNumber = base.trackingNumber ?? tracking.trackingNumber;
  const hasTracking = Boolean(trackingNumber);
  const carrierStatus = tracking.trackingFound ? parseCarrierStatus(tracking.status) : null;
  const status = carrierStatus && carrierStatus !== 'unknown'
    ? carrierStatus
    : base.status;
  const deliveredAt = tracking.deliveredAt ?? base.deliveredAt;
  const carrier = tracking.carrier ?? base.carrier;
  const hasProofOfDelivery =
    status === 'delivered' &&
    (
      tracking.proofOfDeliveryAvailable ||
      tracking.deliveryPhotoAvailable ||
      tracking.signatureAvailable
    );

  let daysSinceDelivery: number | null = null;
  if (deliveredAt) {
    const then = Date.parse(deliveredAt);
    if (!Number.isNaN(then)) {
      daysSinceDelivery = Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
    }
  }

  let gap = tracking.gap;
  if (!gap && !hasTracking) gap = 'no_tracking_number';
  if (!gap && tracking.connected && hasTracking && !tracking.trackingFound) gap = 'tracking_not_found';

  return {
    status,
    carrier,
    trackingNumber,
    trackingUrl: base.trackingUrl,
    deliveredAt,
    hasTracking,
    hasProofOfDelivery,
    daysSinceDelivery,
    trackingProvider: tracking.provider,
    trackingProviderConnected: tracking.connected,
    carrierDirectConnected: tracking.connected && tracking.provider != null,
    scanCount: tracking.scanCount,
    lastScanAt: tracking.lastScanAt,
    exceptionCount: tracking.exceptionCount,
    estimatedDeliveryAt: tracking.estimatedDeliveryAt,
    trackingGap: gap,
    deliveryPhotoAvailable: tracking.deliveryPhotoAvailable,
    deliveryPhotoFinding: base.deliveryPhotoFinding,
    deliveryPhotoFindingRationale: base.deliveryPhotoFindingRationale,
    deliveryPhotoFindingAt: base.deliveryPhotoFindingAt,
    signatureAvailable: tracking.signatureAvailable,
    gpsSupported: tracking.gpsSupported,
  };
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Concise delivery evidence line for INR widget and case UI. */
export function formatDeliveryEvidenceLine(delivery: DeliverySlice | null): string {
  if (!delivery) return 'Delivery evidence: No order fulfilment on file';

  if (delivery.trackingGap === 'provider_not_connected') {
    return 'Delivery evidence: Tracking provider not connected';
  }
  if (delivery.trackingGap === 'no_tracking_number' || (!delivery.hasTracking && !delivery.trackingNumber)) {
    return 'Delivery evidence: No tracking number on Shopify order';
  }
  if (delivery.trackingGap === 'tracking_not_found') {
    return 'Delivery evidence: Tracking not found by the connected carrier';
  }
  if (delivery.trackingGap === 'carrier_unsupported') {
    return 'Delivery evidence: Carrier unsupported by tracking provider';
  }

  const status = delivery.status ?? 'unknown';
  const lastScan = formatShortDate(delivery.lastScanAt);
  const delivered = formatShortDate(delivery.deliveredAt);

  if (status === 'delivered' && delivered) {
    const scans = delivery.scanCount > 0 ? ` · ${delivery.scanCount} scans` : '';
    const exceptions = delivery.exceptionCount > 0
      ? ` · exception: ${delivery.exceptionCount} event(s)`
      : ' · no exception events';
    const artefacts = [
      delivery.deliveryPhotoAvailable ? 'photo' : null,
      delivery.signatureAvailable ? 'signature' : null,
    ].filter(Boolean);
    const proof = artefacts.length > 0
      ? ` · artefact: ${artefacts.join(' + ')}`
      : ' · no delivery artefact';
    const finding = delivery.deliveryPhotoFinding
      ? ` · photo finding: ${delivery.deliveryPhotoFinding}`
      : '';
    return `Delivery evidence: Carrier reported delivered on ${delivered}${scans}${exceptions}${proof}${finding}`;
  }

  if (status === 'in_transit') {
    const last = lastScan ? ` · last scan ${lastScan}` : '';
    const exception = delivery.exceptionCount > 0 ? ' · exception: delayed' : '';
    return `Delivery evidence: In transit${last}${exception}`;
  }

  if (status === 'exception' || delivery.exceptionCount > 0) {
    const last = lastScan ? ` · last scan ${lastScan}` : '';
    return `Delivery evidence: Exception reported${last}`;
  }

  const scans = delivery.scanCount > 0 ? ` · ${delivery.scanCount} scans` : '';
  const last = lastScan ? ` · last scan ${lastScan}` : '';
  return `Delivery evidence: ${status.replace(/_/g, ' ')}${scans}${last}`;
}
