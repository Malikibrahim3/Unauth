/**
 * Canonical webhook event envelope + per-type data schemas.
 *
 * The envelope is strictly validated; `data` is validated by a discriminated
 * per-event-type schema. Every data payload requires an `external_id` at
 * minimum. The merchant is NEVER taken from the body — it is derived from the
 * authenticated credential (see auth.ts).
 *
 * See ARCHITECTURE.md for the canonical API and product-truth owners.
 */
import { z } from 'zod';

export const SUPPORTED_EVENT_TYPES = [
  'customer.created', 'customer.updated',
  'order.created', 'order.updated',
  'refund.created', 'refund.updated',
  'replacement.created', 'replacement.updated',
  'ticket.created', 'ticket.updated', 'message.created',
  'shipment.created', 'shipment.updated', 'shipment.delivered', 'shipment.exception_recorded',
  'tracking_event.recorded',
  'return.created', 'return.updated',
  'dispute.created', 'dispute.updated',
  'evidence.created',
  'loss.confirmed',
  'recovery.created', 'recovery.completed',
] as const;
export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

export const eventSourceSchema = z.object({
  system: z.string().trim().min(1),
  account_id: z.string().trim().min(1).optional(),
  record_id: z.string().trim().min(1),
  record_url: z.string().url().optional(),
});

export const eventEnvelopeSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(SUPPORTED_EVENT_TYPES),
  // Accept an offset; the normalization layer converts to ISO UTC.
  occurred_at: z.string().datetime({ offset: true }),
  source: eventSourceSchema,
  data: z.record(z.unknown()),
  schema_version: z.number().int().positive().default(1),
});
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

// Minimal per-type data requirements (all passthrough extra provider fields).
const withExternalId = z.object({ external_id: z.string().trim().min(1) }).passthrough();
const money = { currency: z.string().trim().length(3), amount_minor: z.number().int().optional() };

const DATA_SCHEMAS: Record<SupportedEventType, z.ZodTypeAny> = {
  'customer.created': withExternalId,
  'customer.updated': withExternalId,
  'order.created': withExternalId.extend({ currency: z.string().trim().length(3) }),
  'order.updated': withExternalId,
  'refund.created': withExternalId.extend({ ...money }),
  'refund.updated': withExternalId,
  'replacement.created': withExternalId,
  'replacement.updated': withExternalId,
  'ticket.created': withExternalId,
  'ticket.updated': withExternalId,
  'message.created': withExternalId,
  'shipment.created': withExternalId,
  'shipment.updated': withExternalId,
  'shipment.delivered': withExternalId,
  'shipment.exception_recorded': withExternalId,
  'tracking_event.recorded': withExternalId,
  'return.created': withExternalId,
  'return.updated': withExternalId,
  'dispute.created': withExternalId,
  'dispute.updated': withExternalId,
  'evidence.created': withExternalId,
  'loss.confirmed': withExternalId,
  'recovery.created': withExternalId,
  'recovery.completed': withExternalId,
};

export type EnvelopeValidation =
  | { ok: true; envelope: EventEnvelope }
  | { ok: false; errors: Array<{ field: string; message: string }> };

export function validateEventEnvelope(raw: unknown): EnvelopeValidation {
  const parsed = eventEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => ({ field: i.path.join('.') || 'envelope', message: i.message })) };
  }
  const dataSchema = DATA_SCHEMAS[parsed.data.type];
  const dataParsed = dataSchema.safeParse(parsed.data.data);
  if (!dataParsed.success) {
    return { ok: false, errors: dataParsed.error.issues.map((i) => ({ field: `data.${i.path.join('.')}`, message: i.message })) };
  }
  return { ok: true, envelope: parsed.data };
}
