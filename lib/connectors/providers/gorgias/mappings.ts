/**
 * Gorgias raw → canonical record mappings.
 *
 * Wraps the existing helpdesk normalization; the shared support-intake parsing
 * functions remain. Produces a source-neutral CanonicalTicket.
 */
import type { CanonicalTicket } from '@/lib/canonical/records';
import { toIsoUtc, toStringOrNull } from '@/lib/connectors/mapping/normalizeValue';
import { recordError, hasBlockingError, type RecordError } from '@/lib/connectors/mapping/recordErrors';

type Raw = Record<string, unknown>;

export function mapGorgiasTicket(payload: Raw): { ticket: CanonicalTicket | null; errors: RecordError[] } {
  const errors: RecordError[] = [];
  const externalId = toStringOrNull(payload.id);
  if (!externalId) errors.push(recordError('externalId', 'required_field_missing', 'ticket id missing'));
  if (hasBlockingError(errors)) return { ticket: null, errors };

  const customerRaw = (payload.customer ?? null) as Raw | null;
  return {
    ticket: {
      externalId: externalId as string,
      subject: toStringOrNull(payload.subject),
      channel: toStringOrNull(payload.channel),
      status: toStringOrNull(payload.status),
      customer: customerRaw
        ? {
            externalId: toStringOrNull(customerRaw.id),
            email: toStringOrNull(customerRaw.email),
            name: toStringOrNull(customerRaw.name),
            phone: toStringOrNull(customerRaw.phone),
          }
        : null,
      orderReference: null, // Gorgias carries the order ref in the message body, resolved by the matcher (Phase 5).
      openedAt: toIsoUtc(payload.created_datetime),
    },
    errors,
  };
}
