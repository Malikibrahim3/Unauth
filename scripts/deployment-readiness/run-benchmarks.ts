import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { runBlindDataset, ensureBlindFixtures, parseMerchantCsv } from '../../tests/identity/blindHarness';

const outDir = path.resolve(process.cwd(), 'reports/deployment-readiness/benchmarks');
fs.mkdirSync(outDir, { recursive: true });

type DatasetSummary = {
  dataset: string;
  rows: number;
  processed: number;
  expectedFlagged: number;
  surfaced: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  reviewRate: number;
  largestCluster: number;
  linkedClusters: number;
  gradeCounts: Record<string, number>;
  durationMs: number;
};

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

async function runDataset(dataset: string): Promise<DatasetSummary> {
  const start = performance.now();
  const result = await runBlindDataset(dataset);
  const durationMs = Math.round(performance.now() - start);
  const tp = result.diagnostics.expectedFlagged - result.diagnostics.falseNegativeIds.length;
  const fp = result.diagnostics.falsePositiveIds.length;
  const fn = result.diagnostics.falseNegativeIds.length;
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

  const summary: DatasetSummary = {
    dataset,
    rows: result.diagnostics.totalRows,
    processed: result.diagnostics.rowsFetched,
    expectedFlagged: result.diagnostics.expectedFlagged,
    surfaced: result.diagnostics.actualFlagged,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    precision: round(precision),
    recall: round(recall),
    reviewRate: round(result.diagnostics.reviewRate),
    largestCluster: result.diagnostics.largestCluster,
    linkedClusters: result.summary.linkedClusters,
    gradeCounts: {
      definite: result.summary.definite,
      probable: result.summary.probable,
      possible: result.summary.possible,
      weak: result.summary.weak,
    },
    durationMs,
  };

  fs.writeFileSync(
    path.join(outDir, `${dataset}.summary.json`),
    `${JSON.stringify({ summary, diagnostics: result.diagnostics, parse: result.parse }, null, 2)}\n`,
  );
  return summary;
}

async function runHeaderChaos() {
  const files = [
    'header_chaos_shopify.csv',
    'header_chaos_woocommerce.csv',
    'header_chaos_amazon.csv',
    'header_chaos_etsy_semicolon_bom.csv',
    'header_chaos_stripe_pipe.csv',
    'header_chaos_custom_mixed_case.csv',
    'header_chaos_duplicate_headers.csv',
    'header_chaos_missing_important.csv',
  ];

  const rows = [];
  for (const file of files) {
    const parsed = await parseMerchantCsv(file);
    rows.push({
      file,
      valid: parsed.valid,
      rowCount: parsed.rowCount,
      missingRequired: parsed.missingRequired,
      unmappedHeaders: parsed.unmappedHeaders,
      headerCount: parsed.headers.length,
    });
  }
  fs.writeFileSync(path.join(outDir, 'header-chaos.summary.json'), `${JSON.stringify(rows, null, 2)}\n`);
  return rows;
}

async function main() {
  ensureBlindFixtures();
  const datasets = [
    'small_sanity',
    'medium_realistic',
    'negative_control',
    'adversarial_fraud',
    'large_merchant_scale',
  ];
  const summaries: DatasetSummary[] = [];
  for (const dataset of datasets) {
    summaries.push(await runDataset(dataset));
  }
  const headerChaos = await runHeaderChaos();

  const md = [
    '# Deployment Readiness Benchmarks',
    '',
    '| Dataset | Rows | Surfaced | TP | FP | FN | Precision | Recall | Review rate | Largest cluster | Linked clusters |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...summaries.map((s) =>
      `| ${s.dataset} | ${s.rows} | ${s.surfaced} | ${s.truePositives} | ${s.falsePositives} | ${s.falseNegatives} | ${s.precision} | ${s.recall} | ${s.reviewRate} | ${s.largestCluster} | ${s.linkedClusters} |`
    ),
    '',
    '## Header Chaos',
    '',
    '| File | Valid | Rows | Missing required | Unmapped headers |',
    '|---|---:|---:|---|---:|',
    ...headerChaos.map((h) =>
      `| ${h.file} | ${h.valid ? 'yes' : 'no'} | ${h.rowCount} | ${h.missingRequired.join(', ') || '-'} | ${h.unmappedHeaders.length} |`
    ),
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'BENCHMARK_SUMMARY.md'), md);
  fs.writeFileSync(path.join(outDir, 'benchmark-summary.json'), `${JSON.stringify({ summaries, headerChaos }, null, 2)}\n`);
  console.log(md);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
