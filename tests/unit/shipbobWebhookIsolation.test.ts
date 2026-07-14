import {
  shipBobDomainEventType,
  shipBobWebhookEventId,
  shipBobWebhookIdempotencyKey,
} from '@/lib/integrations/providers/shipbobWebhook';

describe('ShipBob webhook isolation', () => {
  it('scopes a reused provider event id to the selected provider account', () => {
    expect(shipBobWebhookIdempotencyKey('channel-a', 'connection-a', 'event-1'))
      .not.toBe(shipBobWebhookIdempotencyKey('channel-b', 'connection-b', 'event-1'));
  });

  it('uses the connection as the scope when no provider account reference exists', () => {
    expect(shipBobWebhookIdempotencyKey(null, 'connection-a', 'event-1'))
      .toBe('shipbob:connection-a:event-1');
  });

  it('derives a stable non-reversible id when ShipBob omits the webhook id', () => {
    const first = shipBobWebhookEventId('{"order":1}', null);
    expect(first).toBe(shipBobWebhookEventId('{"order":1}', null));
    expect(first).not.toBe(shipBobWebhookEventId('{"order":2}', null));
    expect(first).toMatch(/^body-sha256:[a-f0-9]{64}$/);
  });

  it('maps only subscribed topics and rejects unknown topics', () => {
    expect(shipBobDomainEventType('order.shipment.delivered')).toBe('shipment.delivered');
    expect(shipBobDomainEventType('order.shipment.exception')).toBe('shipment.updated');
    expect(shipBobDomainEventType('unexpected.topic')).toBeNull();
  });
});
