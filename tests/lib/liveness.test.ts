/**
 * §7.4 / LP-MOT-08: transport, activity, freshness, and live are independent
 * axes. These cover the truthful primitives — `isLive` never invents a
 * heartbeat, and recency copy follows the just-now/minute/hour/day grammar
 * with a fixed `nowMs` (never `Date.now()`, so the fixture is deterministic).
 */
import { isLive, formatRecency, formatAsOf, formatAbsolute } from '@/lib/design/liveness';

const NOW = Date.parse('2026-07-29T12:00:00.000Z');

describe('isLive — verified subscription + heartbeat only', () => {
  it('is false without a heartbeat (a snapshot/webhook/poll is never "Live")', () => {
    expect(isLive(null, NOW)).toBe(false);
    expect(isLive(undefined, NOW)).toBe(false);
  });

  it('is false once the heartbeat has expired', () => {
    expect(isLive({ heartbeatExpiresAt: '2026-07-29T11:59:59.000Z' }, NOW)).toBe(false);
  });

  it('is true while the domain-supplied heartbeat is still valid', () => {
    expect(isLive({ heartbeatExpiresAt: '2026-07-29T12:00:30.000Z' }, NOW)).toBe(true);
  });

  it('is false for an unparseable heartbeat rather than guessing', () => {
    expect(isLive({ heartbeatExpiresAt: 'not-a-date' }, NOW)).toBe(false);
  });
});

describe('formatRecency — §7.4 recency copy', () => {
  it('says "just now" under 60 seconds', () => {
    expect(formatRecency('2026-07-29T11:59:30.000Z', NOW)).toBe('Updated just now');
  });

  it('uses minute granularity, then hours, then days', () => {
    expect(formatRecency('2026-07-29T11:58:00.000Z', NOW)).toBe('Updated 2 minutes ago');
    expect(formatRecency('2026-07-29T11:59:00.000Z', NOW)).toBe('Updated 1 minute ago');
    expect(formatRecency('2026-07-29T09:00:00.000Z', NOW)).toBe('Updated 3 hours ago');
    expect(formatRecency('2026-07-27T12:00:00.000Z', NOW)).toBe('Updated 2 days ago');
  });

  it('returns "Unknown" for a missing or invalid timestamp', () => {
    expect(formatRecency(null, NOW)).toBe('Unknown');
    expect(formatRecency('nope', NOW)).toBe('Unknown');
  });

  it('never renders a negative age when the timestamp is in the future', () => {
    expect(formatRecency('2026-07-29T12:05:00.000Z', NOW)).toBe('Updated just now');
  });
});

describe('formatAsOf / formatAbsolute — snapshot copy', () => {
  it('prefixes snapshot data with "As of"', () => {
    expect(formatAsOf('2026-07-29T12:00:00.000Z')).toMatch(/^As of /);
  });

  it('degrades honestly when the timestamp is unknown', () => {
    expect(formatAsOf(null)).toBe('As of an unknown time');
    expect(formatAbsolute(undefined)).toBe('Time unknown');
  });
});
