import {
  computeClaimQueueCounts,
  fetchClaimQueueCounts,
  isClaimAssignedTo,
  isClaimInActiveQueue,
  isClaimInHistory,
  isClaimSnoozed,
  isClaimUnassignedActive,
  isUnreadActiveClaim,
} from '@/lib/claims/queueCounts';
import { claimsListTotalForView, formatClaimsResultText, resolveClaimsListView } from '@/lib/claims/claimsQueueUi';

const now = new Date('2026-05-27T12:00:00.000Z');
const userId = 'user-1';

describe('claim queue count semantics', () => {
  it('keeps failed and capped async metrics non-authoritative', async () => {
    const responses = Array.from({ length: 14 }, () => ({ count: 2, data: [], error: null }));
    responses[2] = { count: null as unknown as number, data: [], error: { message: 'unread failed' } } as never;
    responses[13] = { count: 2, data: [{ status: 'open', submitted_at: '2026-05-01T00:00:00.000Z' }], error: null } as never;
    let queryIndex = 0;
    const client = {
      from: () => {
        const response = responses[queryIndex++];
        const builder: Record<string, unknown> = {};
        for (const method of ['select', 'eq', 'in', 'or', 'is', 'not', 'gt']) {
          builder[method] = () => builder;
        }
        builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve);
        return builder;
      },
    };

    const result = await fetchClaimQueueCounts(client, 'merchant-1', 'user-1');
    expect(result.counts.active).toBe(2);
    expect(result.coverageByMetric.active).toBe('complete');
    expect(result.coverageByMetric.unread).toBe('unavailable');
    expect(result.coverageByMetric.overdue).toBe('partial');
    expect(result.aggregateCoverage).toBe('partial');
  });

  it('treats active unviewed claims as unread', () => {
    const row = {
      status: 'open',
      first_viewed_at: null,
      snoozed_until: null,
      submitted_at: '2026-05-26T12:00:00.000Z',
    };
    expect(isClaimInActiveQueue(row, now)).toBe(true);
    expect(isUnreadActiveClaim(row, now)).toBe(true);
  });

  it('excludes viewed claims from unread but keeps them in active queue', () => {
    const row = {
      status: 'open',
      first_viewed_at: '2026-05-26T11:00:00.000Z',
      snoozed_until: null,
      submitted_at: '2026-05-20T12:00:00.000Z',
    };
    expect(isClaimInActiveQueue(row, now)).toBe(true);
    expect(isUnreadActiveClaim(row, now)).toBe(false);
  });

  it('excludes snoozed claims from active and unread counts', () => {
    const row = {
      status: 'open',
      first_viewed_at: null,
      snoozed_until: '2026-05-30T12:00:00.000Z',
      submitted_at: '2026-05-26T12:00:00.000Z',
    };
    expect(isClaimSnoozed(row, now)).toBe(true);
    expect(isClaimInActiveQueue(row, now)).toBe(false);
    expect(isUnreadActiveClaim(row, now)).toBe(false);
  });

  it('excludes resolved claims from active and unread counts', () => {
    const row = {
      status: 'resolved_refunded',
      first_viewed_at: null,
      snoozed_until: null,
      submitted_at: '2026-05-20T12:00:00.000Z',
    };
    expect(isClaimInHistory(row)).toBe(true);
    expect(isClaimInActiveQueue(row, now)).toBe(false);
    expect(isUnreadActiveClaim(row, now)).toBe(false);
  });

  it('opened claim remains unassigned until explicitly assigned', () => {
    const row = {
      status: 'open',
      first_viewed_at: '2026-05-26T10:00:00.000Z',
      assigned_to: null,
      snoozed_until: null,
      submitted_at: '2026-05-26T12:00:00.000Z',
    };
    expect(isClaimUnassignedActive(row, now)).toBe(true);
    expect(isClaimAssignedTo(row, userId)).toBe(false);
  });

  it('assigned claim moves from unassigned to assigned to me', () => {
    const assigned = {
      status: 'open',
      first_viewed_at: '2026-05-26T10:00:00.000Z',
      assigned_to: userId,
      snoozed_until: null,
      submitted_at: '2026-05-26T12:00:00.000Z',
    };
    expect(isClaimAssignedTo(assigned, userId)).toBe(true);
    expect(isClaimUnassignedActive(assigned, now)).toBe(false);
  });

  it('aggregates active, unread, overdue, snoozed, and history from rows', () => {
    const counts = computeClaimQueueCounts(
      [
        { status: 'open', first_viewed_at: null, snoozed_until: null, submitted_at: '2026-05-18T12:00:00.000Z' },
        { status: 'open', first_viewed_at: '2026-05-26T11:00:00.000Z', snoozed_until: null, submitted_at: '2026-05-26T12:00:00.000Z' },
        { status: 'open', first_viewed_at: null, snoozed_until: '2026-05-30T12:00:00.000Z', submitted_at: '2026-05-26T12:00:00.000Z' },
        { status: 'resolved_refunded', first_viewed_at: null, snoozed_until: null, submitted_at: '2026-05-20T12:00:00.000Z' },
      ],
      userId,
      now,
    );
    expect(counts.active).toBe(2);
    expect(counts.unread).toBe(1);
    expect(counts.overdue).toBe(1);
    expect(counts.snoozed).toBe(1);
    expect(counts.resolved).toBe(1);
  });

  it('sidebar unread count should not equal active when some claims are viewed', () => {
    const counts = computeClaimQueueCounts(
      [
        { status: 'open', first_viewed_at: null, snoozed_until: null, submitted_at: '2026-05-26T12:00:00.000Z' },
        { status: 'open', first_viewed_at: '2026-05-26T10:00:00.000Z', snoozed_until: null, submitted_at: '2026-05-26T11:00:00.000Z' },
      ],
      null,
      now,
    );
    expect(counts.active).toBe(2);
    expect(counts.unread).toBe(1);
    expect(counts.unread).toBeLessThan(counts.active);
  });
});

describe('claims queue UI helpers', () => {
  const counts = {
    total: 300,
    active: 55,
    unread: 54,
    assignedToMe: 10,
    unassigned: 45,
    overdue: 50,
    awaitingEvidence: 4,
    awaitingInfo: 6,
    snoozed: 3,
    escalated: 2,
    resolved: 217,
    open: 30,
    underReview: 12,
  };

  it('sidebar badge uses unread not active total', () => {
    expect(counts.unread).not.toBe(counts.active);
    expect(claimsListTotalForView({ kind: 'unread' }, counts)).toBe(54);
  });

  it('formats result text for unread and active views', () => {
    expect(formatClaimsResultText({ showing: 25, totalMatching: 55, view: { kind: 'active' } }))
      .toBe('Showing 25 of 55 case reviews');
    expect(formatClaimsResultText({ showing: 12, totalMatching: 54, view: { kind: 'unread' } }))
      .toBe('Showing 12 of 54 cases with new evidence');
  });

  it('resolves list view from query params', () => {
    expect(resolveClaimsListView({ viewed: 'unread' }).kind).toBe('unread');
    expect(resolveClaimsListView({ owner: 'me' }).kind).toBe('assigned_me');
    expect(resolveClaimsListView({ queue: 'snoozed' }).kind).toBe('snoozed');
  });
});
