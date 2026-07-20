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

  it('ranks only compatible, positive, non-written-off loss value, grouped by raw key', () => {
    expect(selectLossContributions([
      { key: 'carrier_claim', label: 'Carrier', amountMinor: 2500, currency: 'GBP', writtenOff: false },
      { key: 'carrier_claim', label: 'Carrier', amountMinor: 500, currency: 'GBP', writtenOff: false },
      { key: 'warehouse_error', label: 'Warehouse', amountMinor: 1200, currency: 'GBP', writtenOff: false },
      { key: 'other_currency', label: 'Other currency', amountMinor: 9000, currency: 'USD', writtenOff: false },
      { key: 'written_off', label: 'Written off', amountMinor: 8000, currency: 'GBP', writtenOff: true },
      { key: 'unavailable', label: 'Unavailable', amountMinor: null, currency: 'GBP', writtenOff: false },
    ], 'GBP')).toEqual([
      { key: 'carrier_claim', label: 'Carrier', valueMajor: 30 },
      { key: 'warehouse_error', label: 'Warehouse', valueMajor: 12 },
    ]);
  });

  it('groups represented notification dates and zero-fills the rest of the window (a day with no activity is a real zero)', () => {
    expect(selectNotificationActivity([
      { createdAt: '2026-07-15T10:00:00.000Z', readAt: null },
      { createdAt: '2026-07-15T12:00:00.000Z', readAt: '2026-07-15T13:00:00.000Z' },
      { createdAt: '2026-07-17T09:00:00.000Z', readAt: null },
      { createdAt: 'invalid', readAt: null },
    ], 7, '2026-07-17T00:00:00.000Z')).toEqual([
      { label: 'Sat', dateLabel: '2026-07-11', read: 0, unread: 0 },
      { label: 'Sun', dateLabel: '2026-07-12', read: 0, unread: 0 },
      { label: 'Mon', dateLabel: '2026-07-13', read: 0, unread: 0 },
      { label: 'Tue', dateLabel: '2026-07-14', read: 0, unread: 0 },
      { label: 'Wed', dateLabel: '2026-07-15', read: 1, unread: 1 },
      { label: 'Thu', dateLabel: '2026-07-16', read: 0, unread: 0 },
      { label: 'Fri', dateLabel: '2026-07-17', read: 0, unread: 1 },
    ]);
  });
});
