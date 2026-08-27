/**
 * Canonical intake → canonical record mappings + entity-type helpers.
 *
 * Canonical webhook/API/CSV payloads already arrive in a source-neutral shape
 * (money in minor units, canonical statuses). These mappers validate and
 * normalize them (e.g. timestamps with offsets → ISO UTC) into the same
 * CanonicalOrder/Refund/Shipment shapes that connector mappings produce, so a
 * given order is identical whether it came from Shopify or a canonical source.
 *
 * See ARCHITECTURE.md for the canonical product-truth owner.
 */
import type { CanonicalOrder, CanonicalOrderLine, CanonicalRefund, CanonicalShipment, CanonicalTicket } from '@/lib/canonical/records';
import { CANONICAL_ENTITY_TYPES, type CanonicalEntityType } from '@/lib/canonical/records';
import { mapCarrierShipmentStatus } from '@/lib/canonical/statuses';
import { toIsoUtc, asMinor, toIntOrNull, toStringOrNull } from '@/lib/connectors/mapping/normalizeValue';
import { recordError, hasBlockingError, type RecordError } from '@/lib/connectors/mapping/recordErrors';
import { canonicalOrderSchema, canonicalRefundSchema, canonicalShipmentSchema } from '@/lib/canonical/validation';

type Raw = Record<string, unknown>;

export function isCanonicalEntityType(value: string): value is CanonicalEntityType {
  return (CANONICAL_ENTITY_TYPES as readonly string[]).includes(value);
}

export function mapCanonicalOrder(data: Raw): { order: CanonicalOrder | null; errors: RecordError[] } {
  const errors: RecordError[] = [];
  const currency = toStringOrNull(data.currency);
  const externalId = toStringOrNull(data.external_id);
  if (!externalId) errors.push(recordError('externalId', 'required_field_missing', 'external_id missing'));
  if (!currency) errors.push(recordError('currency', 'required_field_missing', 'currency missing'));
  if (hasBlockingError(errors)) return { order: null, errors };

  const cur = (currency as string).toUpperCase();
  const customerRaw = (data.customer ?? null) as Raw | null;
  const linesRaw = Array.isArray(data.lines) ? (data.lines as Raw[]) : [];

  const lines: CanonicalOrderLine[] = linesRaw.map((l) => ({
    externalId: toStringOrNull(l.external_id),
    sku: toStringOrNull(l.sku),
    title: toStringOrNull(l.title),
    quantity: toIntOrNull(l.quantity),
    unitPriceMinor: asMinor(l.unit_price_minor),
    totalMinor: asMinor(l.total_minor),
    currency: toStringOrNull(l.currency)?.toUpperCase() ?? cur,
  }));

  const candidate: CanonicalOrder = {
    externalId: externalId as string,
    orderNumber: toStringOrNull(data.order_number),
    currency: cur,
    totalMinor: asMinor(data.total_minor),
    subtotalMinor: asMinor(data.subtotal_minor),
    financialStatus: (toStringOrNull(data.financial_status) as CanonicalOrder['financialStatus']) ?? 'unknown',
    sourceFinancialStatus: toStringOrNull(data.financial_status),
    fulfillmentStatus: (toStringOrNull(data.fulfillment_status) as CanonicalOrder['fulfillmentStatus']) ?? 'unknown',
    sourceFulfillmentStatus: toStringOrNull(data.fulfillment_status),
    placedAt: toIsoUtc(data.placed_at),
    customer: customerRaw
      ? {
          externalId: toStringOrNull(customerRaw.external_id),
          email: toStringOrNull(customerRaw.email),
          name: toStringOrNull(customerRaw.name),
          phone: toStringOrNull(customerRaw.phone),
        }
      : null,
    lines,
  };

  const parsed = canonicalOrderSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(recordError(issue.path.join('.') || 'order', 'invalid_value', issue.message));
    }
    return { order: null, errors };
  }
  return { order: parsed.data as CanonicalOrder, errors };
}

export function mapCanonicalRefund(data: Raw): { refund: CanonicalRefund | null; errors: RecordError[] } {
  const externalId = toStringOrNull(data.external_id);
  const currency = toStringOrNull(data.currency);
  const errors: RecordError[] = [];
  if (!externalId) errors.push(recordError('externalId', 'required_field_missing', 'external_id missing'));
  if (!currency) errors.push(recordError('currency', 'required_field_missing', 'currency missing'));
  if (hasBlockingError(errors)) return { refund: null, errors };

  const candidate: CanonicalRefund = {
    externalId: externalId as string,
    orderExternalId: toStringOrNull(data.order_external_id),
    reason: toStringOrNull(data.reason),
    amountMinor: asMinor(data.amount_minor),
    currency: (currency as string).toUpperCase(),
    refundedAt: toIsoUtc(data.refunded_at),
  };
  const parsed = canonicalRefundSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(recordError(issue.path.join('.') || 'refund', 'invalid_value', issue.message));
    return { refund: null, errors };
  }
  return { refund: parsed.data as CanonicalRefund, errors };
}

export function mapCanonicalTicket(data: Raw): { ticket: CanonicalTicket | null; errors: RecordError[] } {
  const externalId = toStringOrNull(data.external_id);
  const errors: RecordError[] = [];
  if (!externalId) {
    errors.push(recordError('externalId', 'required_field_missing', 'external_id missing'));
    return { ticket: null, errors };
  }
  const customerRaw = (data.customer ?? null) as Raw | null;
  return {
    ticket: {
      externalId,
      subject: toStringOrNull(data.subject),
      channel: toStringOrNull(data.channel),
      status: toStringOrNull(data.status),
      customer: customerRaw
        ? {
            externalId: toStringOrNull(customerRaw.external_id),
            email: toStringOrNull(customerRaw.email),
            name: toStringOrNull(customerRaw.name),
            phone: toStringOrNull(customerRaw.phone),
          }
        : null,
      orderReference: toStringOrNull(data.order_reference),
      openedAt: toIsoUtc(data.opened_at),
    },
    errors,
  };
}

export function mapCanonicalShipment(data: Raw): { shipment: CanonicalShipment | null; errors: RecordError[] } {
  const externalId = toStringOrNull(data.external_id);
  const errors: RecordError[] = [];
  if (!externalId) {
    errors.push(recordError('externalId', 'required_field_missing', 'external_id missing'));
    return { shipment: null, errors };
  }
  const candidate: CanonicalShipment = {
    externalId,
    orderExternalId: toStringOrNull(data.order_external_id),
    trackingNumber: toStringOrNull(data.tracking_number),
    carrier: toStringOrNull(data.carrier),
    service: toStringOrNull(data.service),
    status: mapCarrierShipmentStatus(toStringOrNull(data.status)),
    sourceStatus: toStringOrNull(data.source_status) ?? toStringOrNull(data.status),
    shippedAt: toIsoUtc(data.shipped_at),
    deliveredAt: toIsoUtc(data.delivered_at),
  };
  const parsed = canonicalShipmentSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(recordError(issue.path.join('.') || 'shipment', 'invalid_value', issue.message));
    return { shipment: null, errors };
  }
  return { shipment: parsed.data as CanonicalShipment, errors };
}
