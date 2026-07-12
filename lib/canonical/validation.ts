/**
 * Zod validators for canonical records. Enforce ISO currency (3 letters),
 * integer minor units, and ISO-UTC timestamps. A failed required field yields a
 * validation error so a partial canonical entity is never persisted.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §3.
 */
import { z } from 'zod';
import { ORDER_FINANCIAL_STATUSES, FULFILLMENT_STATES, SHIPMENT_STATUSES } from '@/lib/canonical/statuses';

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter ISO code');

export const minorUnitsSchema = z.number().int();
export const isoTimestampSchema = z.string().datetime({ offset: false }).nullable();

export const canonicalCustomerSchema = z.object({
  externalId: z.string().nullable(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
});

export const canonicalOrderLineSchema = z.object({
  externalId: z.string().nullable(),
  sku: z.string().nullable(),
  title: z.string().nullable(),
  quantity: z.number().int().nullable(),
  unitPriceMinor: minorUnitsSchema.nullable(),
  totalMinor: minorUnitsSchema.nullable(),
  currency: currencySchema.nullable(),
});

export const canonicalOrderSchema = z.object({
  externalId: z.string().min(1),
  orderNumber: z.string().nullable(),
  currency: currencySchema,
  totalMinor: minorUnitsSchema.nullable(),
  subtotalMinor: minorUnitsSchema.nullable(),
  financialStatus: z.enum(ORDER_FINANCIAL_STATUSES),
  sourceFinancialStatus: z.string().nullable(),
  fulfillmentStatus: z.enum(FULFILLMENT_STATES),
  sourceFulfillmentStatus: z.string().nullable(),
  placedAt: isoTimestampSchema,
  customer: canonicalCustomerSchema.nullable(),
  lines: z.array(canonicalOrderLineSchema),
});

export const canonicalRefundSchema = z.object({
  externalId: z.string().min(1),
  orderExternalId: z.string().nullable(),
  reason: z.string().nullable(),
  amountMinor: minorUnitsSchema.nullable(),
  currency: currencySchema,
  refundedAt: isoTimestampSchema,
});

export const canonicalShipmentSchema = z.object({
  externalId: z.string().min(1),
  orderExternalId: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  carrier: z.string().nullable(),
  service: z.string().nullable(),
  status: z.enum(SHIPMENT_STATUSES),
  sourceStatus: z.string().nullable(),
  shippedAt: isoTimestampSchema,
  deliveredAt: isoTimestampSchema,
});

export type CanonicalOrderInput = z.infer<typeof canonicalOrderSchema>;
