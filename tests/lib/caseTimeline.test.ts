import { domainEventsToTimeline, mergeTimeline, type TimelineItem } from '@/lib/cases/timeline';

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
});
