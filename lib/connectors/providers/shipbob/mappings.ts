/**
 * ShipBob raw → canonical fulfilment / shipment / return.
 *
 * Wraps existing ShipBob warehouse code. Warehouse-accountability evidence is
 * projected from these canonical records, not persisted only as evidence.
 */
import type { CanonicalFulfilment, CanonicalShipment, CanonicalReturn } from '@/lib/canonical/records';
import { mapCarrierShipmentStatus } from '@/lib/canonical/statuses';
import { toIsoUtc, toStringOrNull } from '@/lib/connectors/mapping/normalizeValue';
import { recordError, type RecordError } from '@/lib/connectors/mapping/recordErrors';

type Raw = Record<string, unknown>;

export function mapShipBobOrder(order: Raw): {
  fulfilments: CanonicalFulfilment[];
  shipments: CanonicalShipment[];
  errors: RecordError[];
} {
  const errors: RecordError[] = [];
  const orderExternalId = toStringOrNull(order.reference_id) ?? toStringOrNull(order.id);
  const shipmentsRaw = Array.isArray(order.shipments) ? (order.shipments as Raw[]) : [];

  const fulfilments: CanonicalFulfilment[] = [];
  const shipments: CanonicalShipment[] = [];

  for (const s of shipmentsRaw) {
    const shipmentId = toStringOrNull(s.id);
    if (!shipmentId) {
      errors.push(recordError('externalId', 'required_field_missing', 'shipbob shipment id missing', { severity: 'warning' }));
      continue;
    }
    fulfilments.push({
      externalId: shipmentId,
      orderExternalId,
      status: toStringOrNull(s.status),
      sourceStatus: toStringOrNull(s.status),
      trackingNumber: toStringOrNull(s.tracking_number),
      carrier: toStringOrNull(s.carrier),
    });
    shipments.push({
      externalId: shipmentId,
      orderExternalId,
      trackingNumber: toStringOrNull(s.tracking_number),
      carrier: toStringOrNull(s.carrier),
      service: null,
      status: mapCarrierShipmentStatus(toStringOrNull(s.status)),
      sourceStatus: toStringOrNull(s.status),
      shippedAt: toIsoUtc(s.ship_date),
      deliveredAt: null,
    });
  }

  return { fulfilments, shipments, errors };
}

export function mapShipBobReturn(ret: Raw, orderExternalId?: string | null): { canonicalReturn: CanonicalReturn | null; errors: RecordError[] } {
  const externalId = toStringOrNull(ret.id);
  const errors: RecordError[] = [];
  if (!externalId) {
    errors.push(recordError('externalId', 'required_field_missing', 'shipbob return id missing'));
    return { canonicalReturn: null, errors };
  }
  return {
    canonicalReturn: {
      externalId,
      orderExternalId: orderExternalId ?? null,
      status: toStringOrNull(ret.status),
      sourceStatus: toStringOrNull(ret.status),
      disposition: toStringOrNull(ret.disposition),
      requestedAt: toIsoUtc(ret.requested_at ?? ret.created_at),
    },
    errors,
  };
}
