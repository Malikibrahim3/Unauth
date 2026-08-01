import {
  resolveSeriesRole,
  resolveSeriesSet,
  classifyValue,
  computeRate,
  computeRateFromBuckets,
  reconcilesToTotal,
  assertWaterfallReconciles,
  distinctCurrencies,
  assertSingleCurrency,
  canRenderTrend,
  canRenderComparison,
  truthfulPointCount,
  ChartContractError,
  MAX_SIMULTANEOUS_CATEGORIES,
} from '@/lib/visualisation/chartContract';

describe('chart series role mapping (§6.2)', () => {
  it('maps current to a solid accent analytical mark', () => {
    expect(resolveSeriesRole('current')).toMatchObject({
      colorVar: 'var(--ua-chart-primary)',
      dashed: false,
      meaning: 'analytical',
      meaningfulMarkAllowed: true,
    });
  });

  it('maps comparison to a neutral dashed mark so the encoding survives greyscale', () => {
    const comparison = resolveSeriesRole('comparison');
    expect(comparison.dashed).toBe(true);
    expect(comparison.colorVar).toContain('--ua-chart-neutral');
    expect(comparison.meaning).toBe('analytical');
  });

  it('treats baseline as a context value that cannot carry a meaningful mark', () => {
    const baseline = resolveSeriesRole('baseline');
    expect(baseline.colorVar).toBe('var(--ua-chart-neutral-300)');
    expect(baseline.meaning).toBe('baseline');
    expect(baseline.meaningfulMarkAllowed).toBe(false);
  });

  it('maps the semantic roles to the status triplets, not the ramp', () => {
    expect(resolveSeriesRole('success').colorVar).toBe('var(--ua-success)');
    expect(resolveSeriesRole('warning').meaning).toBe('semantic');
    expect(resolveSeriesRole('critical').colorVar).toBe('var(--ua-critical)');
  });
});

describe('resolveSeriesSet role enforcement (§6.2)', () => {
  it('allows up to five simultaneous analytical categories', () => {
    const roles = ['current', 'related', 'strong', 'secondary', 'tertiary'] as const;
    expect(() => resolveSeriesSet(roles.map((role) => ({ role })))).not.toThrow();
    expect(roles.length).toBe(MAX_SIMULTANEOUS_CATEGORIES);
  });

  it('rejects a sixth simultaneous analytical category', () => {
    const roles = ['current', 'related', 'strong', 'secondary', 'tertiary', 'comparison'] as const;
    expect(() => resolveSeriesSet(roles.map((role) => ({ role })))).toThrow(ChartContractError);
  });

  it('does not count semantic or baseline marks toward the categorical budget', () => {
    expect(() =>
      resolveSeriesSet([
        { role: 'current' },
        { role: 'related' },
        { role: 'strong' },
        { role: 'secondary' },
        { role: 'tertiary' },
        { role: 'success' },
        { role: 'warning' },
        { role: 'baseline' },
      ]),
    ).not.toThrow();
  });

  it('rejects using a baseline role as a meaningful mark', () => {
    expect(() => resolveSeriesSet([{ role: 'baseline', meaningful: true }])).toThrow(/baseline/);
  });
});

describe('null / zero / unavailable stay distinct (§6.6)', () => {
  it('classifies missing measurements as unavailable, not zero', () => {
    expect(classifyValue(null)).toBe('unavailable');
    expect(classifyValue(undefined)).toBe('unavailable');
    expect(classifyValue(Number.NaN)).toBe('unavailable');
    expect(classifyValue(Infinity)).toBe('unavailable');
  });

  it('keeps a measured zero distinct from an absent value', () => {
    expect(classifyValue(0)).toBe('zero');
    expect(classifyValue(1250)).toBe('value');
  });
});

describe('rate aggregation never averages pre-aggregated percentages (§6.8, LP-VIZ-08)', () => {
  it('sums raw numerators and denominators rather than averaging bucket rates', () => {
    // Mean of the two bucket rates would be (0.5 + 0.125) / 2 = 0.3125 — wrong.
    // The truthful pooled rate is 2 / 10 = 0.2.
    const rate = computeRateFromBuckets([
      { numerator: 1, denominator: 2 },
      { numerator: 1, denominator: 8 },
    ]);
    expect(rate).toBeCloseTo(0.2, 10);
    expect(rate).not.toBeCloseTo(0.3125, 4);
  });

  it('returns null (undefined rate) when there are no events, not zero', () => {
    expect(computeRateFromBuckets([{ numerator: 0, denominator: 0 }])).toBeNull();
    expect(computeRate(0, 0)).toBeNull();
    expect(computeRate(null, 10)).toBeNull();
  });

  it('rejects non-finite, negative, or over-unity counts', () => {
    expect(() => computeRateFromBuckets([{ numerator: Number.NaN, denominator: 1 }])).toThrow(ChartContractError);
    expect(() => computeRateFromBuckets([{ numerator: -1, denominator: 1 }])).toThrow(ChartContractError);
    expect(() => computeRateFromBuckets([{ numerator: 5, denominator: 2 }])).toThrow(/exceeds/);
    // A "success" count with no trials is contradictory, not a zero rate.
    expect(() => computeRate(3, 0)).toThrow(/exceeds/);
  });
});

describe('waterfall reconciliation (§6.8, LP-VIZ-08)', () => {
  const steps = [
    { key: 'order', label: 'Order amount', value: 10000 },
    { key: 'adjust', label: 'Valid adjustments', value: -1500 },
    { key: 'disputed', label: 'Disputed', value: -500 },
  ];

  it('accepts a waterfall whose components reconcile to the total within rounding', () => {
    expect(reconcilesToTotal(steps, 8000, 1)).toBe(true);
    expect(() => assertWaterfallReconciles(steps, 8000)).not.toThrow();
  });

  it('rejects a waterfall that does not reconcile to its displayed total', () => {
    expect(reconcilesToTotal(steps, 9000, 1)).toBe(false);
    expect(() => assertWaterfallReconciles(steps, 9000)).toThrow(ChartContractError);
  });
});

describe('mixed currency is split or blocked, never combined (§6.8)', () => {
  it('returns the single shared currency', () => {
    expect(assertSingleCurrency([{ currency: 'GBP' }, { currency: 'GBP' }])).toBe('GBP');
  });

  it('lists distinct currencies and blocks a mixed aggregation', () => {
    expect(distinctCurrencies([{ currency: 'GBP' }, { currency: 'USD' }, { currency: 'GBP' }])).toEqual(['GBP', 'USD']);
    expect(() => assertSingleCurrency([{ currency: 'GBP' }, { currency: 'USD' }])).toThrow(/mixed currency/);
  });

  it('blocks a currency-free monetary aggregation', () => {
    expect(() => assertSingleCurrency([{ currency: null }])).toThrow(ChartContractError);
  });
});

describe('minimum data rules (§6.8)', () => {
  it('counts only truthful points', () => {
    expect(truthfulPointCount([1, null, 3, undefined, 0])).toBe(3);
  });

  it('needs three truthful points for a trend and seven for a comparison', () => {
    expect(canRenderTrend([1, 2])).toBe(false);
    expect(canRenderTrend([1, 2, 3])).toBe(true);
    expect(canRenderComparison([1, 2, 3, 4, 5, 6])).toBe(false);
    expect(canRenderComparison([1, 2, 3, 4, 5, 6, 7])).toBe(true);
  });
});
