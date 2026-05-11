/**
 * tests/eval/regression.test.ts
 *
 * Engine regression gate. This benchmark is tuned for conservative identity
 * review where false positives are costlier than false negatives:
 *   - precision floor protects merchants from noisy review queues
 *   - recall floor ensures seeded abuse patterns are still surfaced
 *   - F1 floor remains as an overall quality backstop
 */

process.env.IDENTITY_SALT =
  process.env.IDENTITY_SALT || 'test-salt-0000000000000000000000000000000000000000000000000000000000000000000000';

import path from 'path';
import fs from 'fs';
import { runEvalWithReport } from '@/lib/eval/runner';

const DATASET_PATH = path.join(process.cwd(), 'test-data/realistic_fraud_dataset.csv');
const PRECISION_FLOOR = 0.80;
const RECALL_FLOOR = 0.60;
const F1_FLOOR = 0.70;

describe('Engine regression — realistic_fraud_dataset.csv', () => {
  it('dataset exists at expected path', () => {
    const exists = fs.existsSync(DATASET_PATH);
    if (!exists) {
      throw new Error(
        `Labelled dataset not found at test-data/realistic_fraud_dataset.csv — ` +
        `regenerate it per FRAUD_RINGS_BREAKDOWN.md`
      );
    }
    expect(exists).toBe(true);
  });

  it(
    `meets conservative regression floors (P>=${PRECISION_FLOOR}, R>=${RECALL_FLOOR}, F1>=${F1_FLOOR})`,
    () => {
    if (!fs.existsSync(DATASET_PATH)) {
      throw new Error(
        `Labelled dataset not found at test-data/realistic_fraud_dataset.csv — ` +
        `regenerate it per FRAUD_RINGS_BREAKDOWN.md`
      );
    }

    const { report } = runEvalWithReport(DATASET_PATH);

    // eslint-disable-next-line no-console
    console.log(
      `[regression] F1=${report.f1.toFixed(3)} ` +
      `P=${report.precision.toFixed(3)} R=${report.recall.toFixed(3)} ` +
      `TP=${report.truePositives} FP=${report.falsePositives} ` +
      `FN=${report.falseNegatives} TN=${report.trueNegatives}`
    );

      expect(report.precision).toBeGreaterThanOrEqual(PRECISION_FLOOR);
      expect(report.recall).toBeGreaterThanOrEqual(RECALL_FLOOR);
      expect(report.f1).toBeGreaterThanOrEqual(F1_FLOOR);
    }
  );
});
