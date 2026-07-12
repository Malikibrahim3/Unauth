/**
 * Shopify raw → canonical record mappings.
 *
 * Extracted mapping logic (the existing lib/shopify/ingest.ts remains
 * orchestration compatibility). Money uses the order currency; provider status
 * strings are preserved as sourceStatus while canonical status is mapped.
 */
import type { CanonicalOrder, CanonicalOrderLine, CanonicalRefund } from '@/lib/canonical/records';
import { mapShopifyFinancialStatus, mapShopifyFulfillmentStatus } from '@/lib/canonical/statuses';
import { toIsoUtc, toMinor, toStringOrNull, toIntOrNull } from '@/lib/connectors/mapping/normalizeValue';
import { recordError, hasBlockingError, type RecordError } from '@/lib/connectors/mapping/recordErrors';
import { canonicalOrderSchema } from '@/lib/canonical/validation';

type Raw = Record<string, unknown>;

function fullName(first: unknown, last: unknown): string | null {
  const name = [toStringOrNull(first), toStringOrNull(last)].filter(Boolean).join(' ').trim();
  return name === '' ? null : name;
}

export function mapShopifyOrder(payload: Raw): { order: CanonicalOrder | null; errors: RecordError[] } {
  const errors: RecordError[] = [];
  const currency = toStringOrNull(payload.currency);
  const externalId = toStringOrNull(payload.id);
  if (!externalId) errors.push(recordError('externalId', 'required_field_missing', 'order id missing', { rawValue: payload.id }));
  if (!currency) errors.push(recordError('currency', 'required_field_missing', 'currency missing'));
  if (hasBlockingError(errors)) return { order: null, errors };

  const cur = currency as string;
  const customerRaw = (payload.customer ?? null) as Raw | null;
  const lineItems = Array.isArray(payload.line_items) ? (payload.line_items as Raw[]) : [];

  const lines: CanonicalOrderLine[] = lineItems.map((li) => {
    const qty = toIntOrNull(li.quantity);
    const unit = toMinor(li.price, cur);
    return {
      externalId: toStringOrNull(li.id),
      sku: toStringOrNull(li.sku),
      title: toStringOrNull(li.title),
      quantity: qty,
      unitPriceMinor: unit,
      totalMinor: unit != null && qty != null ? unit * qty : null,
      currency: cur,
    };
  });

  const candidate: CanonicalOrder = {
    externalId: externalId as string,
    orderNumber: toStringOrNull(payload.order_number),
    currency: cur,
    totalMinor: toMinor(payload.total_price, cur),
    subtotalMinor: toMinor(payload.subtotal_price, cur),
    financialStatus: mapShopifyFinancialStatus(toStringOrNull(payload.financial_status)),
    sourceFinancialStatus: toStringOrNull(payload.financial_status),
    fulfillmentStatus: mapShopifyFulfillmentStatus(toStringOrNull(payload.fulfillment_status)),
    sourceFulfillmentStatus: toStringOrNull(payload.fulfillment_status),
    placedAt: toIsoUtc(payload.created_at),
    customer: customerRaw
      ? {
          externalId: toStringOrNull(customerRaw.id),
          email: toStringOrNull(customerRaw.email) ?? toStringOrNull(payload.email),
          name: fullName(customerRaw.first_name, customerRaw.last_name),
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

export function mapShopifyRefund(payload: Raw): { refund: CanonicalRefund | null; errors: RecordError[] } {
  const errors: RecordError[] = [];
  const externalId = toStringOrNull(payload.id);
  const currency = toStringOrNull(payload.currency) ?? 'USD';
  if (!externalId) {
    errors.push(recordError('externalId', 'required_field_missing', 'refund id missing'));
    return { refund: null, errors };
  }
  return {
    refund: {
      externalId,
      orderExternalId: toStringOrNull(payload.order_id),
      reason: toStringOrNull(payload.note) ?? toStringOrNull(payload.reason),
      amountMinor: toMinor(payload.amount, currency),
      currency: currency.toUpperCase(),
      refundedAt: toIsoUtc(payload.created_at ?? payload.processed_at),
    },
    errors,
  };
}
