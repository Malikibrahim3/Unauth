import { proportionalLength } from '@/lib/visualisation/proportionalLength';

describe('proportionalLength', () => {
  it('uses one zero baseline so 3 and 1 cannot render at equal length', () => {
    expect(proportionalLength(3, 3)).toBe(100);
    expect(proportionalLength(1, 3)).toBeCloseTo(33.333, 3);
  });

  it('keeps zero at zero and clamps invalid or over-domain values', () => {
    expect(proportionalLength(0, 3)).toBe(0);
    expect(proportionalLength(Number.NaN, 3)).toBe(0);
    expect(proportionalLength(4, 3)).toBe(100);
  });
});
