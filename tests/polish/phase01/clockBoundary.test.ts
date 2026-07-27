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
import { spawnSync } from 'node:child_process';

/**
 * The fixture is an ES module and the Jest runtime is CommonJS, so it is read
 * through a short-lived Node process rather than an interop shim.
 */
function fixtureFor(asOf: string): { fingerprint: string; heroUpdatedAt: string } {
  const script = `
    import { buildFixture, fingerprint } from './scripts/phase1-qa/fixture.mjs';
    const fixture = buildFixture(${JSON.stringify(asOf)});
    const hero = fixture.cases.find((row) => row.key === 'completeCase');
    console.log(JSON.stringify({ fingerprint: fingerprint(fixture), heroUpdatedAt: hero.updated_at }));
  `;
  const result = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
}

const AS_OF = '2026-07-26T12:00:00.000Z';
const LATER_AS_OF = '2026-09-14T12:00:00.000Z';

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

  it('keeps labels plausibly recent when the clock moves forward with the fixture', () => {
    // The fixture derives every timestamp from `asOf`, so advancing the clock
    // and the fixture together must not age the data.
    for (const asOf of [AS_OF, LATER_AS_OF]) {
      setClock(asOf);
      expect(formatRelativeTime(fixtureFor(asOf).heroUpdatedAt)).toBe('2 days ago');
      resetClock();
    }
  });

  it('reproduces the same fixture fingerprint for the same asOf', () => {
    expect(fixtureFor(AS_OF).fingerprint).toBe(fixtureFor(AS_OF).fingerprint);
  });

  it('produces a different fingerprint for a different asOf', () => {
    expect(fixtureFor(AS_OF).fingerprint).not.toBe(fixtureFor(LATER_AS_OF).fingerprint);
  });
});
