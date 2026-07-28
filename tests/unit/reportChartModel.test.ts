import { buildCumulativeFinancialSeries } from '@/components/reporting/reportChartModel';

describe('buildCumulativeFinancialSeries', () => {
  const exposure = [
    { key: '2026-07-01', label: '1 Jul', currentMinor: 1000, previousMinor: 500 },
    { key: '2026-07-02', label: '2 Jul', currentMinor: null, previousMinor: null },
    { key: '2026-07-03', label: '3 Jul', currentMinor: 250, previousMinor: 100 },
  ];
  const recovered = [
    { key: '2026-07-01', label: '1 Jul', currentMinor: null, previousMinor: null },
    { key: '2026-07-02', label: '2 Jul', currentMinor: 200, previousMinor: null },
    { key: '2026-07-03', label: '3 Jul', currentMinor: null, previousMinor: null },
  ];

  it('carries a known cumulative value through event-free buckets', () => {
    const result = buildCumulativeFinancialSeries({ exposure, recovered });

    expect(result.map((point) => point.cumulativeExposureMinor)).toEqual([1000, 1000, 1250]);
    expect(result.map((point) => point.cumulativeRecoveredMinor)).toEqual([0, 200, 200]);
    expect(result.map((point) => point.previousCumulativeExposureMinor)).toEqual([500, 500, 600]);
    expect(result.map((point) => point.state)).toEqual(['observed', 'observed', 'observed']);
  });

  it('preserves raw increments separately from cumulative values', () => {
    const result = buildCumulativeFinancialSeries({ exposure, recovered });

    expect(result[1]).toMatchObject({
      exposureIncrementMinor: null,
      recoveredIncrementMinor: 200,
      cumulativeExposureMinor: 1000,
      cumulativeRecoveredMinor: 200,
    });
  });

  it('breaks an explicitly unknown interval and never bridges it', () => {
    const result = buildCumulativeFinancialSeries({
      exposure,
      recovered,
      unknownKeys: new Set(['2026-07-02']),
    });

    expect(result.map((point) => point.cumulativeExposureMinor)).toEqual([1000, null, null]);
    expect(result.map((point) => point.cumulativeRecoveredMinor)).toEqual([0, null, null]);
    expect(result[1].state).toBe('unknown');
  });

  it('omits a previous series when no previous events exist', () => {
    const result = buildCumulativeFinancialSeries({
      exposure: exposure.map((bucket) => ({ ...bucket, previousMinor: null })),
      recovered,
    });

    expect(result.every((point) => point.previousCumulativeExposureMinor == null)).toBe(true);
  });
});
