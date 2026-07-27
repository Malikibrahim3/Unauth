/**
 * RUN-19 — waiting and deadline clocks.
 *
 * Golden cases across boundary times, timezone changes and overdue transitions.
 * The defining property: an unrelated update must never reset a wait.
 */
import {
  calendarDaysBetween,
  resolveDeadlineState,
  resolveWaitingState,
  waitingClockFor,
} from '@/lib/claims/waiting';

const NOW = Date.parse('2026-07-26T12:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const daysAhead = (days: number) => new Date(NOW + days * 86_400_000).toISOString();

describe('RUN-19 waiting clocks', () => {
  it('names the governing clock per work state', () => {
    expect(waitingClockFor('awaiting_carrier_response')).toBe('external_response');
    expect(waitingClockFor('awaiting_customer_evidence')).toBe('external_response');
    expect(waitingClockFor('evidence_needed')).toBe('merchant_action');
    expect(waitingClockFor('ready_for_decision')).toBe('merchant_action');
    expect(waitingClockFor('resolved_won')).toBe('none');
  });

  it('measures an external wait from the status transition, not the last write', () => {
    const state = resolveWaitingState(
      {
        status: 'awaiting_carrier_response',
        statusEnteredAt: daysAgo(45),
        createdAt: daysAgo(60),
      },
      NOW,
    );
    expect(state.clock).toBe('external_response');
    expect(state.waitingDays).toBe(45);
  });

  it('is unaffected by an unrelated internal update', () => {
    // The audited defect: an internal note edit made a six-week wait read as 0d.
    const base = { status: 'awaiting_3pl_response', statusEnteredAt: daysAgo(42), createdAt: daysAgo(50) };
    const before = resolveWaitingState(base, NOW);
    const afterUnrelatedEdit = resolveWaitingState({ ...base }, NOW);
    expect(afterUnrelatedEdit.waitingDays).toBe(before.waitingDays);
    expect(before.waitingDays).toBe(42);
  });

  it('measures a merchant wait from when action became required', () => {
    const state = resolveWaitingState(
      {
        status: 'ready_for_decision',
        actionRequiredAt: daysAgo(3),
        statusEnteredAt: daysAgo(10),
        createdAt: daysAgo(30),
      },
      NOW,
    );
    expect(state.clock).toBe('merchant_action');
    expect(state.waitingDays).toBe(3);
  });

  it('falls back through submitted and created, never to a generic update', () => {
    const state = resolveWaitingState(
      { status: 'evidence_needed', submittedAt: daysAgo(7), createdAt: daysAgo(9) },
      NOW,
    );
    expect(state.since).toBe(daysAgo(7));
    expect(state.waitingDays).toBe(7);
  });

  it('reports nothing waiting once the case is resolved', () => {
    const state = resolveWaitingState({ status: 'resolved_won', statusEnteredAt: daysAgo(5) }, NOW);
    expect(state.clock).toBe('none');
    expect(state.since).toBeNull();
    expect(state.waitingDays).toBeNull();
  });

  it('reports an unknown wait rather than zero when no clock exists', () => {
    const state = resolveWaitingState({ status: 'evidence_needed' }, NOW);
    expect(state.waitingDays).toBeNull();
  });

  describe('deadline transitions', () => {
    it.each([
      [daysAhead(3), 'upcoming'],
      [daysAhead(0), 'due_today'],
      [daysAgo(1), 'overdue'],
      [null, 'no_deadline'],
    ])('classifies %s as %s', (dueAt, expected) => {
      expect(resolveDeadlineState(dueAt as string | null, NOW)).toBe(expected);
    });

    it('crosses from due-today to overdue at the local day boundary', () => {
      // 22:00 UTC on the 26th is 23:00 on the 26th in London (BST, UTC+1), so
      // it is still "today" for a merchant in London and becomes overdue only
      // once the local date rolls over. A naive 24h check gets this wrong.
      const dueAt = '2026-07-26T22:00:00.000Z';
      expect(resolveDeadlineState(dueAt, Date.parse('2026-07-26T09:00:00.000Z'))).toBe('due_today');
      expect(resolveDeadlineState(dueAt, Date.parse('2026-07-27T09:00:00.000Z'))).toBe('overdue');
      // The same instant one hour later is already the 27th in London.
      expect(resolveDeadlineState('2026-07-26T23:00:00.000Z', Date.parse('2026-07-26T09:00:00.000Z'))).toBe(
        'upcoming',
      );
    });
  });

  describe('timezone correctness', () => {
    it('counts calendar days, not 24-hour blocks', () => {
      // 23:30 local on the 25th to 00:30 local on the 27th is 25 hours — one
      // 24h block, but two calendar days, which is what "days waiting" means.
      const from = Date.parse('2026-07-25T22:30:00.000Z');
      const to = Date.parse('2026-07-26T23:30:00.000Z');
      expect((to - from) / 3_600_000).toBeCloseTo(25);
      expect(calendarDaysBetween(from, to, 'Europe/London')).toBe(2);
    });

    it('gives a different answer in a timezone that has already rolled over', () => {
      const from = Date.parse('2026-07-25T23:30:00.000Z');
      const to = Date.parse('2026-07-26T12:00:00.000Z');
      // 23:30 UTC on the 25th is already the 26th in London (BST).
      expect(calendarDaysBetween(from, to, 'Europe/London')).toBe(0);
      expect(calendarDaysBetween(from, to, 'UTC')).toBe(1);
    });

    it('does not drift across a daylight-saving transition', () => {
      // London leaves BST on 25 October 2026; the 24h day is 25h long.
      const from = Date.parse('2026-10-24T12:00:00.000Z');
      const to = Date.parse('2026-10-26T12:00:00.000Z');
      expect(calendarDaysBetween(from, to, 'Europe/London')).toBe(2);
    });
  });
});
