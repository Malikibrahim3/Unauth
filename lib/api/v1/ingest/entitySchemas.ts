/**
 * Canonical entity-ingest schemas + row mappers. The order mapper reuses the
 * shared canonical order normalization so an order upserted through the API has
 * the same normalized shape as one from a connector or canonical webhook.
 *
 * See ARCHITECTURE.md §7.2.
 */
import { z } from 'zod';
import { mapCanonicalOrder } from '@/lib/canonical/entities';
import { fromMinorUnits } from '@/lib/canonical/money';

export const customerIngestSchema = z.object({
  external_id: z.string().trim().min(1),
  email: z.string().trim().email().optional(),
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});
export type CustomerIngestInput = z.infer<typeof customerIngestSchema>;

export function customerRow(input: CustomerIngestInput): Record<string, unknown> {
  return {
    raw_metadata: { email: input.email ?? null, name: input.name ?? null, phone: input.phone ?? null },
  };
}

export const orderIngestSchema = z.object({
  external_id: z.string().trim().min(1),
  currency: z.string().trim().length(3),
}).passthrough();

export function orderRowFromCanonical(input: Record<string, unknown>): { row: Record<string, unknown> | null; errors: Array<{ field: string; message: string }> } {
  const { order, errors } = mapCanonicalOrder(input);
  if (!order) return { row: null, errors: errors.map((e) => ({ field: e.field, message: e.message })) };
  // Map to real source_orders columns (decimal price columns via the currency exponent).
  return {
    row: {
      order_number: order.orderNumber,
      financial_status: order.financialStatus,
      fulfillment_state: order.fulfillmentStatus,
      currency: order.currency,
      total_price: order.totalMinor != null ? fromMinorUnits(order.totalMinor, order.currency) : null,
      subtotal_price: order.subtotalMinor != null ? fromMinorUnits(order.subtotalMinor, order.currency) : null,
      customer_email: order.customer?.email ?? null,
      email: order.customer?.email ?? null,
      customer_name: order.customer?.name ?? null,
      line_items_count: order.lines.length,
      placed_at: order.placedAt,
    },
    errors: [],
  };
}
