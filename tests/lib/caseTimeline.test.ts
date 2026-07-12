import {
  commerceEventsToTimeline,
  domainEventsToTimeline,
  mergeTimeline,
  recoveryEventsToTimeline,
  ticketEventsToTimeline,
  workTasksToTimeline,
  type TimelineItem,
} from '@/lib/cases/timeline';

function item(id: string, occurredAt: string, recordedAt: string): TimelineItem {
  return { id, type: 'case.updated', occurredAt, recordedAt, sourceSystem: 'unauth', actor: { type: 'system' }, title: id, freshness: 'fresh' };
}

describe('case timeline', () => {
  it('sorts by provider occurrence time, recorded time, then id and removes duplicate facts', () => {
    const timeline = mergeTimeline(
      [item('b', '2026-01-02T00:00:00.000Z', '2026-01-03T00:00:00.000Z')],
      [item('a', '2026-01-02T00:00:00.000Z', '2026-01-03T00:00:00.000Z'), item('earlier', '2026-01-01T00:00:00.000Z', '2026-01-04T00:00:00.000Z')],
      [item('b', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')],
    );
    expect(timeline.map((entry) => entry.id)).toEqual(['earlier', 'a', 'b']);
  });

  it('keeps occurred_at distinct from ingestion/recorded time', () => {
    const [entry] = domainEventsToTimeline([{
      id: 'evt-1', event_type: 'shipment.delivered', occurred_at: '2026-01-01T00:00:00.000Z',
      recorded_at: '2026-01-03T00:00:00.000Z', actor_type: 'connector', actor_id: null, payload: {},
    }]);
    expect(entry.occurredAt).toBe('2026-01-01T00:00:00.000Z');
    expect(entry.recordedAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('projects source-of-truth commerce facts (order, fulfillment, refund)', () => {
    const items = commerceEventsToTimeline({
      order: { id: 'o1', order_number: '1042', placed_at: '2026-01-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z', total_price: 120, currency: 'GBP' },
      fulfillments: [{ id: 'f1', status: 'success', shipment_status: 'delivered', tracking_company: 'UPS', tracking_number: '1Z9', occurred_at: '2026-01-03T00:00:00.000Z', ingested_at: '2026-01-03T01:00:00.000Z' }],
      refunds: [{ id: 'r1', amount: 20, currency: 'GBP', reason: 'goodwill', refunded_at: '2026-01-05T00:00:00.000Z', ingested_at: '2026-01-05T00:00:00.000Z' }],
    });
    const types = items.map((i) => i.type);
    expect(types).toContain('commerce.order_placed');
    expect(types).toContain('commerce.fulfillment_delivered');
    expect(types).toContain('commerce.refund_issued');
    expect(items.every((i) => i.sourceSystem === 'commerce')).toBe(true);
    expect(items.find((i) => i.type === 'commerce.order_placed')?.relatedValue).toEqual({ amountMinor: 12000, currency: 'GBP' });
  });

  it('merges all five source kinds — commerce, helpdesk, Unauth decision, task, recovery — into one timeline', () => {
    const merged = mergeTimeline(
      commerceEventsToTimeline({ order: { id: 'o1', order_number: '1', placed_at: '2026-01-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z', total_price: 10, currency: 'GBP' } }),
      ticketEventsToTimeline([{ id: 't1', event_type: 'message_received', occurred_at: '2026-01-02T00:00:00.000Z', created_at: '2026-01-02T00:00:00.000Z', summary: 'INR', actor_type: 'customer' }]),
      domainEventsToTimeline([{ id: 'd1', event_type: 'case.decision_recorded', occurred_at: '2026-01-03T00:00:00.000Z', recorded_at: '2026-01-03T00:00:00.000Z', actor_type: 'user', actor_id: 'u1', payload: {} }]),
      workTasksToTimeline([{ id: 'wt1', title: 'Open carrier claim', status: 'open', created_at: '2026-01-04T00:00:00.000Z', updated_at: '2026-01-04T00:00:00.000Z', completed_at: null }]),
      recoveryEventsToTimeline([{ id: 'rc1', event_type: 'submitted', created_at: '2026-01-05T00:00:00.000Z', note: null }]),
    );
    const sources = new Set(merged.map((i) => i.sourceSystem));
    expect(sources).toEqual(new Set(['commerce', 'support', 'unauth']));
    expect(merged.map((i) => i.type)).toEqual([
      'commerce.order_placed', 'ticket.message_received', 'case.decision_recorded', 'task.open', 'recovery.submitted',
    ]);
  });
});
