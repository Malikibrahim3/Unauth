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

    // Conservative enterprise baseline:
    // reduce false positives while preserving useful recall on mixed data.
    expect(metrics.f1).toBeGreaterThan(0.5);
    expect(metrics.precision).toBeGreaterThan(0.45);
    expect(metrics.recall).toBeGreaterThan(0.55);
    expect(metrics.baseRate).toBeGreaterThan(0);
  });

  it('clean.csv: strict false-positive ceiling on all-legitimate data', () => {
    const file = path.join(__dirname, '../../test-data/clean.csv');
    const metrics = evaluateFile(file);

    // eslint-disable-next-line no-console
    console.log('clean.csv eval:', JSON.stringify(metrics, null, 2));

    // Enterprise launch gate:
    // clean all-legitimate datasets must stay below 2.5% flag rate.
    expect(metrics.confusionMatrix.falsePositives).toBeLessThanOrEqual(5);
    expect((metrics.flagRate ?? 0)).toBeLessThanOrEqual(0.025);
  });
});
