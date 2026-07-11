/**
 * Canonical, source-neutral record shapes for the MVP+ entity model. Every
 * connector/intake path normalizes into these; downstream code (evidence,
 * matching, cases) reads canonical records, never raw provider payloads.
 *
 * Money is integer minor units + ISO currency. Timestamps are ISO UTC. Provider
 * status is preserved as `sourceStatus`; canonical status is separate.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §3.
 */
import type { OrderFinancialStatus, FulfillmentState, ShipmentStatus } from '@/lib/canonical/statuses';

export type CanonicalCustomer = {
  externalId: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
};

export type CanonicalOrderLine = {
  externalId: string | null;
  sku: string | null;
  title: string | null;
  quantity: number | null;
  unitPriceMinor: number | null;
  totalMinor: number | null;
  currency: string | null;
};

export type CanonicalOrder = {
  externalId: string;
  orderNumber: string | null;
  currency: string;
  totalMinor: number | null;
  subtotalMinor: number | null;
  financialStatus: OrderFinancialStatus;
  sourceFinancialStatus: string | null;
  fulfillmentStatus: FulfillmentState;
  sourceFulfillmentStatus: string | null;
  placedAt: string | null;
  customer: CanonicalCustomer | null;
  lines: CanonicalOrderLine[];
};

export type CanonicalRefund = {
  externalId: string;
  orderExternalId: string | null;
  reason: string | null;
  amountMinor: number | null;
  currency: string;
  refundedAt: string | null;
};

export type CanonicalShipment = {
  externalId: string;
  orderExternalId: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  service: string | null;
  status: ShipmentStatus;
  sourceStatus: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

export type CanonicalTicket = {
  externalId: string;
  subject: string | null;
  channel: string | null;
  status: string | null;
  customer: CanonicalCustomer | null;
  orderReference: string | null;
  openedAt: string | null;
};

export const CANONICAL_ENTITY_TYPES = [
  'customer', 'order', 'order_line', 'refund', 'replacement', 'fulfilment',
  'shipment', 'tracking_event', 'return', 'dispute', 'ticket', 'message',
  'payment', 'transaction', 'evidence',
] as const;
export type CanonicalEntityType = (typeof CANONICAL_ENTITY_TYPES)[number];
