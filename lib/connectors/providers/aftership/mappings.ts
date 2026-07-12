/**
 * AfterShip raw → canonical shipment + tracking events.
 *
 * Wraps existing AfterShip tracking code. Evidence is projected from these
 * canonical records rather than being the only persisted result. Standard
 * tracking APIs do not expose delivery GPS — none is invented here.
 */
import type { CanonicalShipment, CanonicalTrackingEvent } from '@/lib/canonical/records';
import { mapCarrierShipmentStatus } from '@/lib/canonical/statuses';
import { toIsoUtc, toStringOrNull } from '@/lib/connectors/mapping/normalizeValue';
import { recordError, type RecordError } from '@/lib/connectors/mapping/recordErrors';

type Raw = Record<string, unknown>;

export function mapAfterShipTracking(
  tracking: Raw,
): { shipment: CanonicalShipment | null; trackingEvents: CanonicalTrackingEvent[]; errors: RecordError[] } {
  const errors: RecordError[] = [];
  const trackingNumber = toStringOrNull(tracking.tracking_number);
  const externalId = trackingNumber ?? toStringOrNull(tracking.id);
  if (!externalId) {
    errors.push(recordError('externalId', 'required_field_missing', 'tracking number/id missing'));
    return { shipment: null, trackingEvents: [], errors };
  }

  const shipment: CanonicalShipment = {
    externalId,
    orderExternalId: toStringOrNull(tracking.order_id) ?? toStringOrNull(tracking.order_external_id),
    trackingNumber,
    carrier: toStringOrNull(tracking.slug) ?? toStringOrNull(tracking.carrier),
    service: toStringOrNull(tracking.service),
    status: mapCarrierShipmentStatus(toStringOrNull(tracking.current_status)),
    sourceStatus: toStringOrNull(tracking.current_status),
    shippedAt: toIsoUtc(tracking.shipment_pickup_date ?? tracking.shipped_at),
    deliveredAt: toIsoUtc(tracking.delivery_timestamp ?? tracking.delivered_at),
  };

  const checkpoints = Array.isArray(tracking.checkpoints) ? (tracking.checkpoints as Raw[]) : [];
  const trackingEvents: CanonicalTrackingEvent[] = checkpoints.map((cp, i) => ({
    externalId: toStringOrNull(cp.id) ?? `${externalId}:${toStringOrNull(cp.checkpoint_time) ?? i}`,
    status: mapCarrierShipmentStatus(toStringOrNull(cp.tag)),
    sourceStatus: toStringOrNull(cp.tag),
    locationText: toStringOrNull(cp.location),
    description: toStringOrNull(cp.message),
    eventAt: toIsoUtc(cp.checkpoint_time),
  }));

  return { shipment, trackingEvents, errors };
}
