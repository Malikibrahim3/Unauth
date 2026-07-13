/**
 * Idempotently attaches delivery/tracking rows from source_fulfillments as claim
 * evidence for delivery-related claims. Safe to call on every context build.
 */
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';

type DeliverySlice = NonNullable<ClaimDecisionContext['delivery']>;

function isDeliveredStatus(status: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('delivered') || s === 'success' || s === 'fulfilled';
}

export function deriveDeliveryStatus(
  fulfillmentStatus: string | null,
  shipmentStatus: string | null,
  deliveredAt: string | null,
): string {
  if (deliveredAt || isDeliveredStatus(shipmentStatus) || isDeliveredStatus(fulfillmentStatus)) {
    return 'delivered';
  }
  const raw = (shipmentStatus ?? fulfillmentStatus ?? '').toLowerCase();
  if (raw.includes('transit') || raw.includes('shipped') || raw.includes('out_for_delivery')) {
    return 'in_transit';
  }
  if (raw.includes('pending') || raw === '') return 'pending';
  return raw || 'unknown';
}

export function buildDeliveryFromFulfillment(row: {
  status: string | null;
  shipment_status: string | null;
  tracking_company: string | null;
  tracking_number: string | null;
  occurred_at: string | null;
}): DeliverySlice {
  const deliveredAt = isDeliveredStatus(row.shipment_status) || isDeliveredStatus(row.status)
    ? row.occurred_at
    : null;
  const trackingNumber = row.tracking_number?.trim() || null;
  const status = deriveDeliveryStatus(row.status, row.shipment_status, deliveredAt);
  const hasProofOfDelivery = status === 'delivered' && Boolean(deliveredAt);
  let daysSinceDelivery: number | null = null;
  if (deliveredAt) {
    const then = Date.parse(deliveredAt);
    if (!Number.isNaN(then)) {
      daysSinceDelivery = Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
    }
  }
  return {
    status,
    carrier: row.tracking_company?.trim() || null,
    trackingNumber,
    trackingUrl: null,
    deliveredAt,
    hasTracking: Boolean(trackingNumber),
    hasProofOfDelivery,
    daysSinceDelivery,
    trackingProvider: null,
    trackingProviderConnected: false,
    afterShipConnected: false,
    scanCount: 0,
    lastScanAt: null,
    exceptionCount: 0,
    estimatedDeliveryAt: null,
    trackingGap: trackingNumber ? null : 'no_tracking_number',
    deliveryPhotoAvailable: false,
    signatureAvailable: false,
    gpsSupported: false,
  };
}
