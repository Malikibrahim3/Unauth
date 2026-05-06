process.env.IDENTITY_SALT = process.env.IDENTITY_SALT || 'test-salt-0000000000000000000000000000000000000000000000000000000000000000';

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { csvRowSchema } from '@/lib/csv/schema';
import { cleanRow } from '@/lib/csv/clean';
import { normaliseRow } from '@/lib/csv/normalise';
import { scoreOrders } from '@/lib/engine';
import { computeMetrics } from '@/lib/eval/metrics';
function loadAndParseCsv(filePath: string) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return parsed.data;
}

function evaluateFile(filePath: string) {
  const rawRows = loadAndParseCsv(filePath);
  const validRows: any[] = [];

  for (const raw of rawRows) {
    const cleaned = cleanRow(raw as Record<string, unknown>);
    const result = csvRowSchema.safeParse(cleaned);
    if (result.success) validRows.push(result.data);
  }

  const normOrders = validRows.map(normaliseRow);
  const scored = scoreOrders(normOrders);

  const predicted = scored.map((s) => s.flagged);
  const actual = scored.map((s) => s.order.groundTruthLabel);

  return computeMetrics(predicted, actual);
}

describe('Engine eval on labelled datasets', () => {
  it('mixed.csv: current baseline (records measurable F1)', () => {
    const file = path.join(__dirname, '../../test-data/mixed.csv');
    const metrics = evaluateFile(file);

    // eslint-disable-next-line no-console
    console.log('mixed.csv eval:', JSON.stringify(metrics, null, 2));

    // Baseline at FLAG_THRESHOLD=5: higher recall at cost of precision.
    // realistic_fraud_dataset.csv calibration: F1=0.910, P=1.000, R=0.836.
    // mixed.csv has different signal distribution so precision is lower here.
    expect(metrics.f1).toBeGreaterThan(0.1);
    expect(metrics.precision).toBeGreaterThan(0.1);
    expect(metrics.baseRate).toBeGreaterThan(0);
  });

  it('clean.csv: conservative false-positive ceiling on all-legitimate data', () => {
    const file = path.join(__dirname, '../../test-data/clean.csv');
    const metrics = evaluateFile(file);

    // eslint-disable-next-line no-console
    console.log('clean.csv eval:', JSON.stringify(metrics, null, 2));

    // ENTERPRISE READINESS NOTE:
    // The current false-positive rate on clean.csv is ~53 FPs / 26.5% flag rate.
    // This is NOT acceptable for an ASOS-level pilot where analysts expect near-zero
    // false-flag rates on legitimate orders.
    //
    // This test is MARKED LEGACY / NON-GATING for enterprise readiness. It tracks
    // the current baseline and must not regress, but passing this test does NOT
    // constitute enterprise readiness for clean-merchant scenarios.
    //
    // TODO (enterprise): Drive FP count to < 5 (< 2.5% flag rate) before claiming
    // enterprise readiness. Investigate signal calibration and threshold tuning.
    // See threshold-recommendations.json for current analysis.
    //
    // Current baseline: 53 FPs (FLAG_THRESHOLD=5). Ceiling is set 15% above baseline.
    // Do NOT raise this ceiling — investigate what changed.
    //
    // LEGACY / NON-GATING for enterprise readiness.
    expect(metrics.confusionMatrix.falsePositives).toBeLessThan(62);

    // Log flag rate prominently so CI captures it as a quality metric
    const flagRate = metrics.flagRate ?? 0;
    // eslint-disable-next-line no-console
    console.warn(
      `[LEGACY EVAL] clean.csv flag rate: ${(flagRate * 100).toFixed(1)}% ` +
      `(${metrics.confusionMatrix.falsePositives} FPs). ` +
      'Target for enterprise readiness: < 2.5%. This test is non-gating.'
    );
  });
});
