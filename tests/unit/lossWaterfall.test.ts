import { buildLossWaterfall } from '@/lib/financial/lossWaterfall';

describe('loss waterfall arithmetic', () => {
  it('reconciles the canonical loss bridge in integer minor units', () => {
    const result = buildLossWaterfall({ order_value_minor: 10_000, refund_value_minor: 1_000, chargeback_value_minor: 500 }, { realisedLossMinor: 8_500, estimatedLossMinor: null, recoveredMinor: 2_000 });
    expect(result.reconciled).toBe(true);
    expect(result.steps.at(-1)?.valueMinor).toBe(6_500);
  });
  it('names a recorded adjustment instead of publishing a contradictory net', () => {
    const result = buildLossWaterfall({ adjustment_minor: -250 }, { realisedLossMinor: 9_000, estimatedLossMinor: null, recoveredMinor: 2_000 });
    expect(result.reconciled).toBe(true);
    expect(result.steps).toContainEqual({ key: 'adjustments', label: 'Recorded adjustments', valueMinor: 250, direction: 'subtract' });
    expect(result.steps.at(-1)?.valueMinor).toBe(6_750);
  });
  it('uses the canonical loss fallback when source offsets are absent', () => {
    const result = buildLossWaterfall({}, { realisedLossMinor: 5_000, estimatedLossMinor: null, recoveredMinor: 1_250 });
    expect(result).toMatchObject({ reconciled: true, steps: [{ valueMinor: 5_000 }, { valueMinor: 1_250 }, { valueMinor: 3_750 }] });
  });
  it('does not infer missing financial stages', () => {
    expect(buildLossWaterfall({}, { realisedLossMinor: 5_000, estimatedLossMinor: null, recoveredMinor: null }).reconciled).toBe(false);
  });

  it('proves the published merchant example exactly', () => {
    const result = buildLossWaterfall({}, { realisedLossMinor: 3_560_807, estimatedLossMinor: null, recoveredMinor: 1_635_855 });
    expect(result.steps.at(-1)?.valueMinor).toBe(1_924_952);
  });
});
