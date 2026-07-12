import { recordDomainEvent, DOMAIN_EVENT_TYPES } from '@/lib/events/domainEventStore';

describe('domain event vocabulary', () => {
  it('exposes the MVP+ event vocabulary as past-tense namespaced facts', () => {
    expect(DOMAIN_EVENT_TYPES).toContain('case.decision_recorded');
    expect(DOMAIN_EVENT_TYPES).toContain('refund.created');
    expect(DOMAIN_EVENT_TYPES).toContain('relationship.ambiguous');
    // every type is `namespace.past_tense`
    for (const t of DOMAIN_EVENT_TYPES) {
      expect(t).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });
});

describe('recordDomainEvent', () => {
  it('calls the record_domain_event RPC with mapped params', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { id: 'evt-1' }, error: null });
    const client = { rpc } as any;

    await recordDomainEvent(client, {
      merchantId: 'm-1',
      eventType: 'order.created',
      aggregateType: 'order',
      aggregateId: 'o-1',
      idempotencyKey: 'shopify/uk/ORDER-1',
      payload: { total_minor: 8400 },
      connectionId: 'conn-1',
      handlers: ['caseProjection', 'financialProjection'],
    });

    expect(rpc).toHaveBeenCalledWith('record_domain_event', expect.objectContaining({
      p_merchant_id: 'm-1',
      p_event_type: 'order.created',
      p_aggregate_type: 'order',
      p_aggregate_id: 'o-1',
      p_idempotency_key: 'shopify/uk/ORDER-1',
      p_payload: { total_minor: 8400 },
      p_connection_id: 'conn-1',
      p_handlers: ['caseProjection', 'financialProjection'],
    }));
  });

  it('defaults optional fields and throws on RPC error', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const client = { rpc } as any;
    await expect(
      recordDomainEvent(client, {
        merchantId: 'm-1',
        eventType: 'case.created',
        aggregateType: 'case',
        idempotencyKey: 'k-1',
      }),
    ).rejects.toEqual({ message: 'boom' });

    const args = rpc.mock.calls[0][1];
    expect(args.p_actor_type).toBe('system');
    expect(args.p_handlers).toEqual([]);
    expect(args.p_payload).toEqual({});
    expect(typeof args.p_occurred_at).toBe('string');
  });
});
