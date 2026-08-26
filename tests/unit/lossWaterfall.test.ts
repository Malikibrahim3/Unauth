import { buildLossWaterfall } from '@/lib/financial/lossWaterfall';

describe('loss waterfall arithmetic', () => {
  it('reconciles an exact source formula in integer minor units', () => {
    const result = buildLossWaterfall({ order_value_minor: 10_000, refund_value_minor: 1_000, chargeback_value_minor: 500 }, { realisedLossMinor: 8_500, estimatedLossMinor: null, recoveredMinor: 2_000 });
    expect(result.reconciled).toBe(true);
    expect(result.steps.at(-1)?.valueMinor).toBe(6_500);
  });
  it('withholds the net stage when the source formula conflicts', () => {
    const result = buildLossWaterfall({ order_value_minor: 10_000, refund_value_minor: 1_000, chargeback_value_minor: 500 }, { realisedLossMinor: 9_000, estimatedLossMinor: null, recoveredMinor: 2_000 });
    expect(result.reconciled).toBe(false);
    expect(result.steps.at(-1)?.valueMinor).toBeNull();
  });
  it('uses the canonical loss fallback when source offsets are absent', () => {
    const result = buildLossWaterfall({}, { realisedLossMinor: 5_000, estimatedLossMinor: null, recoveredMinor: 1_250 });
    expect(result).toMatchObject({ reconciled: true, steps: [{ valueMinor: 5_000 }, { valueMinor: 1_250 }, { valueMinor: 3_750 }] });
  });
  it('does not infer missing financial stages', () => {
    expect(buildLossWaterfall({}, { realisedLossMinor: 5_000, estimatedLossMinor: null, recoveredMinor: null }).reconciled).toBe(false);
  });
});
