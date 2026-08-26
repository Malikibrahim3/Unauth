import {
  decodeNotificationCursor,
  encodeNotificationCursor,
  listNotificationsPage,
  NEEDS_NOTIFICATION_KINDS,
  NOTIFICATION_KINDS,
  type NotificationListItem,
} from '@/lib/notifications/store';

type Operation = [string, ...unknown[]];

class NotificationQuery {
  operations: Operation[] = [];
  countMode = false;

  constructor(private readonly rows: NotificationListItem[]) {}

  select(_columns: string, options?: { count?: string; head?: boolean }) {
    this.countMode = options?.head === true;
    this.operations.push(['select', _columns, options]);
    return this;
  }

  eq(...args: unknown[]) { this.operations.push(['eq', ...args]); return this; }
  is(...args: unknown[]) { this.operations.push(['is', ...args]); return this; }
  in(...args: unknown[]) { this.operations.push(['in', ...args]); return this; }
  or(...args: unknown[]) { this.operations.push(['or', ...args]); return this; }
  order(...args: unknown[]) { this.operations.push(['order', ...args]); return this; }
  limit(...args: unknown[]) { this.operations.push(['limit', ...args]); return this; }

  then(resolve: (result: { data: NotificationListItem[] | null; count: number | null; error: null }) => unknown) {
    const hasNeedsKinds = this.operations.some(([name, column, values]) =>
      name === 'in'
      && column === 'kind'
      && Array.isArray(values)
      && values.length === NEEDS_NOTIFICATION_KINDS.length
    );
    const hasUnread = this.operations.some(([name]) => name === 'is');
    const hasSources = this.operations.some(([name, value]) => name === 'or' && String(value).includes('kind.eq.sync_failure'));
    const count = hasNeedsKinds ? 4 : hasSources ? 3 : hasUnread ? 7 : 11;
    return Promise.resolve({
      data: this.countMode ? null : this.rows,
      count: this.countMode ? count : null,
      error: null,
    }).then(resolve);
  }
}

const rows: NotificationListItem[] = [
  { id: '10000000-0000-4000-8000-000000000003', kind: 'assignment', title: 'A', body: null, target_href: '/work', read_at: null, created_at: '2026-08-24T10:00:00.000Z' },
  { id: '10000000-0000-4000-8000-000000000002', kind: 'mention', title: 'B', body: null, target_href: '/cases/2', read_at: null, created_at: '2026-08-24T10:00:00.000Z' },
  { id: '10000000-0000-4000-8000-000000000001', kind: 'sync_failure', title: 'C', body: null, target_href: '/sources/shopify', read_at: null, created_at: '2026-08-24T09:00:00.000Z' },
];

describe('notification server paging contract', () => {
  it('round-trips a stable created-at and id cursor and rejects malformed values', () => {
    const cursor = encodeNotificationCursor(rows[1]!);
    expect(decodeNotificationCursor(cursor)).toEqual({
      createdAt: rows[1]!.created_at,
      id: rows[1]!.id,
    });
    expect(() => decodeNotificationCursor('not-a-cursor')).toThrow('invalid_notification_cursor');
    const badId = Buffer.from(JSON.stringify({ createdAt: rows[1]!.created_at, id: 'not-a-uuid' })).toString('base64url');
    expect(() => decodeNotificationCursor(badId)).toThrow('invalid_notification_cursor');
  });

  it('scopes rows and exact counts to merchant and recipient and pages by both sort keys', async () => {
    const queries: NotificationQuery[] = [];
    const client = {
      from: jest.fn(() => {
        const query = new NotificationQuery(rows);
        queries.push(query);
        return query;
      }),
    };

    const first = await listNotificationsPage(client as never, 'merchant-1', 'user-1', { filter: 'all', limit: 2 });
    expect(first.items.map((item) => item.id)).toEqual(rows.slice(0, 2).map((item) => item.id));
    expect(first.counts).toEqual({ all: 11, unread: 7, needs: 4, sources: 3 });
    expect(decodeNotificationCursor(first.pageInfo.nextCursor)).toEqual({
      createdAt: rows[1]!.created_at,
      id: rows[1]!.id,
    });
    expect(queries[0]!.operations).toEqual(expect.arrayContaining([
      ['eq', 'merchant_id', 'merchant-1'],
      ['eq', 'recipient_user_id', 'user-1'],
      ['order', 'created_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
      ['limit', 3],
    ]));
    expect(queries.filter((query) => query.countMode)).toHaveLength(4);
    expect(queries.every((query) => query.operations.some(([name, column, values]) =>
      name === 'in'
      && column === 'kind'
      && values === NOTIFICATION_KINDS
    ))).toBe(true);

    queries.length = 0;
    await listNotificationsPage(client as never, 'merchant-1', 'user-1', {
      filter: 'unread',
      cursor: first.pageInfo.nextCursor,
      limit: 2,
    });
    expect(queries[0]!.operations).toContainEqual([
      'or',
      `created_at.lt.${rows[1]!.created_at},and(created_at.eq.${rows[1]!.created_at},id.lt.${rows[1]!.id})`,
    ]);
  });

  it('contains only event kinds that have real producers', () => {
    expect(NOTIFICATION_KINDS).toEqual([
      'assignment',
      'mention',
      'approaching_deadline',
      'evidence_update',
      'decision_request',
      'recovery_outcome',
      'sync_failure',
      'high_value_case_alert',
    ]);
    expect(NEEDS_NOTIFICATION_KINDS).toEqual([
      'assignment',
      'mention',
      'approaching_deadline',
      'evidence_update',
      'decision_request',
      'sync_failure',
      'high_value_case_alert',
    ]);
    expect(NEEDS_NOTIFICATION_KINDS).not.toEqual(expect.arrayContaining(['daily_work_summary', 'scheduled_report']));
  });
});
