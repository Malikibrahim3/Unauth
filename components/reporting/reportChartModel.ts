import type { DashboardChartBucket } from '@/components/dashboard/dashboardModel';

export type CumulativeFinancialPoint = {
  key: string;
  label: string;
  exposureIncrementMinor: number | null;
  recoveredIncrementMinor: number | null;
  cumulativeExposureMinor: number | null;
  cumulativeRecoveredMinor: number | null;
  previousCumulativeExposureMinor: number | null;
  state: 'observed' | 'empty' | 'unknown';
};

/**
 * Converts sparse, event-based financial buckets into a truthful cumulative
 * series. Missing event buckets carry a known cumulative value; explicitly
 * unknown buckets remain broken and are never bridged.
 */
export function buildCumulativeFinancialSeries(input: {
  exposure: DashboardChartBucket[];
  recovered: DashboardChartBucket[];
  unknownKeys?: ReadonlySet<string>;
}): CumulativeFinancialPoint[] {
  const recoveredByKey = new Map(input.recovered.map((bucket) => [bucket.key, bucket]));
  const hasPrevious = input.exposure.some((bucket) => bucket.previousMinor != null);
  let cumulativeExposure = 0;
  let cumulativeRecovered = 0;
  let previousCumulativeExposure = 0;
  let currentKnown = true;
  let previousKnown = true;

  return input.exposure.map((bucket) => {
    const recovered = recoveredByKey.get(bucket.key);
    const unknown = input.unknownKeys?.has(bucket.key) ?? false;

    if (unknown) {
      currentKnown = false;
      previousKnown = false;
      return {
        key: bucket.key,
        label: bucket.label,
        exposureIncrementMinor: bucket.currentMinor,
        recoveredIncrementMinor: recovered?.currentMinor ?? null,
        cumulativeExposureMinor: null,
        cumulativeRecoveredMinor: null,
        previousCumulativeExposureMinor: null,
        state: 'unknown' as const,
      };
    }

    if (currentKnown) {
      cumulativeExposure += bucket.currentMinor ?? 0;
      cumulativeRecovered += recovered?.currentMinor ?? 0;
    }
    if (hasPrevious && previousKnown) {
      previousCumulativeExposure += bucket.previousMinor ?? 0;
    }

    const observed = bucket.currentMinor != null || recovered?.currentMinor != null;
    return {
      key: bucket.key,
      label: bucket.label,
      exposureIncrementMinor: bucket.currentMinor,
      recoveredIncrementMinor: recovered?.currentMinor ?? null,
      cumulativeExposureMinor: currentKnown ? cumulativeExposure : null,
      cumulativeRecoveredMinor: currentKnown ? cumulativeRecovered : null,
      previousCumulativeExposureMinor: hasPrevious && previousKnown
        ? previousCumulativeExposure
        : null,
      state: observed ? 'observed' as const : 'empty' as const,
    };
  });
}
