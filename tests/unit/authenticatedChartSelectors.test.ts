import {
  selectDeadlineBands,
  selectLossContributions,
  selectNotificationActivity,
} from '@/lib/visualisation/chartSelectors';

describe('authenticated chart selectors', () => {
  it('places every task deadline in exactly one truthful band', () => {
    const bands = selectDeadlineBands([
      { dueAt: '2026-07-16T10:00:00.000Z' },
      { dueAt: '2026-07-17T12:00:00.000Z' },
      { dueAt: '2026-07-18T00:00:00.000Z' },
      { dueAt: null },
      { dueAt: 'not-a-date' },
    ], Date.parse('2026-07-17T00:00:00.000Z'), Date.parse('2026-07-18T00:00:00.000Z'));
    expect(bands).toEqual({ overdue: 1, dueToday: 1, upcoming: 1, unscheduled: 1, invalid: 1 });
    expect(Object.values(bands).reduce((sum, value) => sum + value, 0)).toBe(5);
  });

  it('ranks only compatible, positive, non-written-off loss value', () => {
    expect(selectLossContributions([
      { label: 'Carrier', amountMinor: 2500, currency: 'GBP', writtenOff: false },
      { label: 'Carrier', amountMinor: 500, currency: 'GBP', writtenOff: false },
      { label: 'Warehouse', amountMinor: 1200, currency: 'GBP', writtenOff: false },
      { label: 'Other currency', amountMinor: 9000, currency: 'USD', writtenOff: false },
      { label: 'Written off', amountMinor: 8000, currency: 'GBP', writtenOff: true },
      { label: 'Unavailable', amountMinor: null, currency: 'GBP', writtenOff: false },
    ], 'GBP')).toEqual([
      { label: 'Carrier', valueMajor: 30 },
      { label: 'Warehouse', valueMajor: 12 },
    ]);
  });

  it('groups only represented notification dates and preserves read state', () => {
    expect(selectNotificationActivity([
      { createdAt: '2026-07-15T10:00:00.000Z', readAt: null },
      { createdAt: '2026-07-15T12:00:00.000Z', readAt: '2026-07-15T13:00:00.000Z' },
      { createdAt: '2026-07-17T09:00:00.000Z', readAt: null },
      { createdAt: 'invalid', readAt: null },
    ])).toEqual([
      { label: 'Wed', dateLabel: '2026-07-15', read: 1, unread: 1 },
      { label: 'Fri', dateLabel: '2026-07-17', read: 0, unread: 1 },
    ]);
  });
});
