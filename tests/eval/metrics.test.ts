import { computeMetrics } from '@/lib/eval/metrics';

describe('computeMetrics', () => {
  it('returns perfect precision and recall for perfect predictions', () => {
    const predicted = [true, true, false, false];
    const actual: ('fraud' | 'legitimate')[] = ['fraud', 'fraud', 'legitimate', 'legitimate'];
    const m = computeMetrics(predicted, actual);
    expect(m.precision).toBe(1);
    expect(m.recall).toBe(1);
    expect(m.f1).toBe(1);
    expect(m.confusionMatrix.truePositives).toBe(2);
    expect(m.confusionMatrix.falsePositives).toBe(0);
    expect(m.confusionMatrix.trueNegatives).toBe(2);
    expect(m.confusionMatrix.falseNegatives).toBe(0);
  });

  it('calculates false positives correctly', () => {
    const predicted = [true, true, true, false];
    const actual: ('fraud' | 'legitimate')[] = ['fraud', 'legitimate', 'legitimate', 'legitimate'];
    const m = computeMetrics(predicted, actual);
    expect(m.confusionMatrix.truePositives).toBe(1);
    expect(m.confusionMatrix.falsePositives).toBe(2);
    expect(m.confusionMatrix.trueNegatives).toBe(1);
    expect(m.precision).toBeCloseTo(1 / 3);
    expect(m.recall).toBe(1);
  });

  it('handles zero division gracefully', () => {
    const predicted = [false, false];
    const actual: ('fraud' | 'legitimate')[] = ['legitimate', 'legitimate'];
    const m = computeMetrics(predicted, actual);
    expect(m.precision).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.f1).toBe(0);
  });

  it('ignores rows with null labels', () => {
    const predicted = [true, false, true];
    const actual = ['fraud', null, 'legitimate'] as ('fraud' | 'legitimate' | null)[];
    const m = computeMetrics(predicted, actual);
    expect(m.confusionMatrix.truePositives).toBe(1);
    expect(m.confusionMatrix.falsePositives).toBe(1);
  });
});
