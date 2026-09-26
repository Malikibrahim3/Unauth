import { ASTERLANE_AUGUST_2026, assertAsterlaneAugust2026Invariants } from '@/lib/product/asterlaneFixture';

describe('Asterlane August 2026 synthetic fixture', () => {
  it('keeps the published GBP identities internally reconciled', () => {
    expect(() => assertAsterlaneAugust2026Invariants()).not.toThrow();
    expect(ASTERLANE_AUGUST_2026.grossExposureMinor).toBe(4_120_842);
    expect(ASTERLANE_AUGUST_2026.grossEntryCount).toBe(218);
    expect(ASTERLANE_AUGUST_2026.held).toEqual({ rowCount: 16, amountMinor: 210_418 });
    expect(ASTERLANE_AUGUST_2026.nonGbpRowCount).toBe(17);
    expect(ASTERLANE_AUGUST_2026.workQueue).toEqual({ itemCount: 23, amountMinor: 1_000_600 });
  });
});
