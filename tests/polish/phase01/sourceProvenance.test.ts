/**
 * RUN-20 — provenance, observation, sync, activity and freshness are separate
 * fields, and impossible combinations are rejected at the read-model boundary.
 */
import {
  ImpossibleProvenanceState,
  isHealthyProvenance,
  resolveSourceProvenance,
} from '@/lib/connections/provenance';

const NOW = Date.parse('2026-07-26T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

describe('RUN-20 source provenance', () => {
  it('keeps the four timestamps distinct', () => {
    const provenance = resolveSourceProvenance(
      {
        identity: 'shopify',
        observedAt: hoursAgo(30),
        syncedAt: hoursAgo(2),
        appActivityAt: hoursAgo(1),
      },
      NOW,
    );
    expect(provenance.observedAt).toBe(hoursAgo(30));
    expect(provenance.syncedAt).toBe(hoursAgo(2));
    expect(provenance.appActivityAt).toBe(hoursAgo(1));
    expect(provenance.freshness).toBe('fresh');
  });

  it('derives freshness from the sync time, never from app activity', () => {
    const stale = resolveSourceProvenance(
      { identity: 'shopify', syncedAt: hoursAgo(200), appActivityAt: hoursAgo(0) },
      NOW,
    );
    // Someone editing an internal note seconds ago must not make a four-day-old
    // source read as up to date.
    expect(stale.freshness).toBe('stale');
    expect(isHealthyProvenance(stale)).toBe(false);
  });

  it.each([
    [1, 'fresh'],
    [24, 'fresh'],
    [25, 'ageing'],
    [72, 'ageing'],
    [73, 'stale'],
  ])('classifies a %ih-old sync as %s', (hours, expected) => {
    expect(resolveSourceProvenance({ identity: 'shopify', syncedAt: hoursAgo(hours) }, NOW).freshness).toBe(expected);
  });

  it('never presents unknown provenance as healthy', () => {
    const unknown = resolveSourceProvenance({ identity: null, appActivityAt: hoursAgo(1) }, NOW);
    expect(unknown.identity).toBeNull();
    expect(unknown.freshness).toBe('unknown');
    expect(isHealthyProvenance(unknown)).toBe(false);
  });

  it('treats a blank identity as unknown rather than a source named ""', () => {
    expect(resolveSourceProvenance({ identity: '   ' }, NOW).identity).toBeNull();
  });

  it('rejects a source timestamp with no source identity', () => {
    expect(() => resolveSourceProvenance({ identity: null, syncedAt: hoursAgo(1) }, NOW)).toThrow(
      ImpossibleProvenanceState,
    );
    expect(() => resolveSourceProvenance({ identity: null, observedAt: hoursAgo(1) }, NOW)).toThrow(
      ImpossibleProvenanceState,
    );
  });

  it('rejects an observation newer than the sync that retrieved it', () => {
    expect(() =>
      resolveSourceProvenance({ identity: 'shopify', observedAt: hoursAgo(1), syncedAt: hoursAgo(5) }, NOW),
    ).toThrow(ImpossibleProvenanceState);
  });

  it('rejects a sync from the future', () => {
    expect(() =>
      resolveSourceProvenance({ identity: 'shopify', syncedAt: new Date(NOW + 7_200_000).toISOString() }, NOW),
    ).toThrow(ImpossibleProvenanceState);
  });

  it('accepts a record known to have no sync yet', () => {
    const pending = resolveSourceProvenance({ identity: 'gorgias' }, NOW);
    expect(pending.freshness).toBe('unknown');
    expect(isHealthyProvenance(pending)).toBe(false);
  });
});
