#!/usr/bin/env ts-node
/**
 * scripts/eval.ts
 *
 * CLI entry point for the Unauth engine eval harness.
 *
 * Usage:
 *   npm run eval -- test-data/realistic_fraud_dataset.csv
 *
 * Exit code 0  → PASS (F1 >= 0.70)
 * Exit code 1  → FAIL (F1 < 0.70 or dataset missing)
 */

// Must be set before any hashing code is loaded
process.env.IDENTITY_SALT =
  process.env.IDENTITY_SALT || 'eval-salt-00000000000000000000000000000000000000000000000000000000000000000000';

import path from 'path';
import { runEvalWithReport } from '../lib/eval/runner';

const F1_FLOOR = 0.70;

function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

async function main() {
  const datasetArg = process.argv[2];
  if (!datasetArg) {
    console.error('Usage: npm run eval -- <path-to-labelled-csv>');
    process.exit(1);
  }

  const filePath = path.isAbsolute(datasetArg)
    ? datasetArg
    : path.join(process.cwd(), datasetArg);

  let result: ReturnType<typeof runEvalWithReport>;
  try {
    result = runEvalWithReport(filePath);
  } catch (err) {
    console.error(`ERROR: ${(err as Error).message}`);
    process.exit(1);
  }

  const { report, labels } = result;
  const totalRows = labels.length;
  const labelledCount = labels.filter(Boolean).length;
  const labelledPct = totalRows > 0 ? ((labelledCount / totalRows) * 100).toFixed(1) : '0.0';

  console.log('');
  console.log('=== UNAUTH ENGINE EVAL ===');
  console.log(`Dataset:     ${datasetArg}`);
  console.log(`Rows:        ${totalRows}`);
  console.log(`Labelled:    ${labelledCount} (${labelledPct}%)`);
  console.log('');
  console.log(`Precision:   ${formatNumber(report.precision)}`);
  console.log(`Recall:      ${formatNumber(report.recall)}`);
  console.log(`F1:          ${formatNumber(report.f1)}`);
  console.log('');
  console.log(
    `TP: ${report.truePositives}  FP: ${report.falsePositives}  ` +
    `FN: ${report.falseNegatives}  TN: ${report.trueNegatives}`
  );
  console.log(`FP cost: ${formatCurrency(report.falsePositiveCost)} (sum of order values of false positives)`);
  console.log('');
  console.log('Per-signal contribution:');

  const signals = Object.entries(report.perSignalContribution).sort(
    ([, a], [, b]) => (b.tpFires + b.fpFires) - (a.tpFires + a.fpFires)
  );

  for (const [name, counts] of signals) {
    const pad = ' '.repeat(Math.max(0, 22 - name.length));
    console.log(`  ${name}:${pad}TP fires: ${counts.tpFires}  FP fires: ${counts.fpFires}`);
  }
  console.log(`  crossMerchant:         TP fires: 0   FP fires: 0  (mocked off in eval)`);
  console.log('');

  const pass = report.f1 >= F1_FLOOR;
  if (pass) {
    console.log(`RESULT: PASS (F1 >= ${F1_FLOOR})`);
  } else {
    console.log(`RESULT: FAIL (F1 ${formatNumber(report.f1)} < ${F1_FLOOR} floor)`);
  }
  console.log('=== END ===');
  console.log('');

  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
