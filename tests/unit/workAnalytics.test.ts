import { buildWorkTimeline } from '@/lib/work/analytics';

describe('buildWorkTimeline', () => {
  const asOf = new Date('2026-08-07T12:00:00.000Z');

  it('keeps interval throughput separate from the closing backlog', () => {
    const result = buildWorkTimeline([
      { id: 'prior', kind: 'task', createdAt: '2026-07-01T10:00:00.000Z', closedAt: null },
      { id: 'same-day', kind: 'task', createdAt: '2026-08-06T09:00:00.000Z', closedAt: '2026-08-06T15:00:00.000Z' },
      { id: 'new-open', kind: 'exception', createdAt: '2026-08-07T08:00:00.000Z', closedAt: null },
    ], asOf, 2);

    expect(result.state).toBe('ready');
    expect(result.opened).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.closingBacklog).toBe(2);
    expect(result.points.map((point) => [point.opened, point.completed, point.backlog])).toEqual([
      [1, 1, 1],
      [1, 0, 2],
    ]);
  });

  it('distinguishes verified empty history from unavailable history', () => {
    expect(buildWorkTimeline([], asOf, 14).state).toBe('empty');
    const unavailable = buildWorkTimeline([], asOf, 14, 'History query failed');
    expect(unavailable.state).toBe('unavailable');
    expect(unavailable.unavailableReason).toBe('History query failed');
  });

  it('does not turn invalid timestamps into activity', () => {
    const result = buildWorkTimeline([
      { id: 'invalid', kind: 'task', createdAt: 'not-a-date', closedAt: null },
    ], asOf, 14);
    expect(result.state).toBe('empty');
    expect(result.closingBacklog).toBe(0);
  });
});
