import { createHash } from 'node:crypto';
import { SHIPBOB_WEBHOOK_TOPICS } from '@/lib/connectors/providers/shipbob/api';

export function shipBobWebhookEventId(rawBody: string, webhookId: string | null): string {
  return webhookId?.trim() || `body-sha256:${createHash('sha256').update(rawBody).digest('hex')}`;
}

export function shipBobWebhookIdempotencyKey(
  accountRef: string | null,
  connectionId: string,
  eventId: string,
): string {
  return `shipbob:${accountRef ?? connectionId}:${eventId}`;
}

export function shipBobDomainEventType(topic: string): 'shipment.delivered' | 'shipment.updated' | null {
  if (!(SHIPBOB_WEBHOOK_TOPICS as readonly string[]).includes(topic)) return null;
  return topic === 'order.shipment.delivered' ? 'shipment.delivered' : 'shipment.updated';
}
