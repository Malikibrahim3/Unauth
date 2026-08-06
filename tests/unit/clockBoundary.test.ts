/**
 * RUN-15 — the shared clock boundary.
 *
 * Production follows real time; deterministic contexts pin an explicit `asOf`.
 * The property that matters is reproducibility: the same fixture and the same
 * clock must produce identical dates and relative-time labels on every run,
 * and a newer `asOf` must keep those labels plausibly recent rather than
 * drifting into staleness.
 */
import { isClockPinned, now, nowMs, resetClock, setClock } from '@/lib/time/clock';
import { formatDate, formatRelativeTime } from '@/lib/utils/format';
const AS_OF = '2026-07-26T12:00:00.000Z';

describe('RUN-15 shared clock boundary', () => {
  afterEach(() => resetClock());

  it('follows real time when nothing is pinned', () => {
    resetClock();
    expect(isClockPinned()).toBe(false);
    expect(Math.abs(nowMs() - Date.now())).toBeLessThan(1_000);
  });

  it('returns the pinned instant once a clock is set', () => {
    setClock(AS_OF);
    expect(isClockPinned()).toBe(true);
    expect(now().toISOString()).toBe(AS_OF);
  });

  it('rejects an unparseable clock rather than silently falling back', () => {
    expect(() => setClock('not-a-date')).toThrow(/unparseable/);
  });

  it('produces identical relative labels across two runs with the same clock', () => {
    const observed = '2026-07-24T12:00:00.000Z';
    setClock(AS_OF);
    const first = { relative: formatRelativeTime(observed), absolute: formatDate(observed) };
    resetClock();
    setClock(AS_OF);
    const second = { relative: formatRelativeTime(observed), absolute: formatDate(observed) };
    expect(second).toEqual(first);
    expect(first.relative).toBe('2 days ago');
  });

});
