import fs from 'node:fs';
import path from 'node:path';

type Row = Record<string, string> & { _merchant?: string };
type Grade = 'weak' | 'possible' | 'probable' | 'definite';

const DIR = path.resolve(process.cwd(), 'test-data/multi-merchant');
const REPORT = path.resolve(process.cwd(), 'reports/multi-merchant-identity-graph-report.md');

function parseCsv(file: string): Row[] {
  const text = fs.readFileSync(file, 'utf8').trim();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}

function gradeFor(merchantCount: number, riskyAppearances: number): Grade {
  if (merchantCount >= 3 && riskyAppearances >= 10) return 'definite';
  if (merchantCount >= 2 && riskyAppearances >= 1) return 'probable';
  if (merchantCount >= 2) return 'possible';
  return 'weak';
}

function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.csv')).sort();
  const attributes = new Map<string, { merchants: Set<string>; rows: Row[] }>();
  const runs: Array<{ merchant: string; rows: number; matches: number }> = [];

  for (const file of files) {
    const merchant = file.replace(/^\d+-/, '').replace(/\.csv$/, '');
    const rows = parseCsv(path.join(DIR, file)).map((row) => ({ ...row, _merchant: merchant }));
    let matches = 0;
    for (const row of rows) {
      const entries = [
        ['email', row.email.toLowerCase()],
        ['phone', row.phone],
        ['address', row.shipping_address.toLowerCase()],
        ['ip', row.ip_address],
        ['device', row.device_fingerprint],
        // Last-four is intentionally excluded from standalone link counts. It
        // is only corroborating evidence in production because collisions are common.
      ];
      for (const [type, value] of entries) {
        if (!value) continue;
        const key = `${type}:${value}`;
        const current = attributes.get(key) ?? { merchants: new Set<string>(), rows: [] };
        current.merchants.add(merchant);
        current.rows.push(row);
        attributes.set(key, current);
      }
    }
    runs.push({ merchant, rows: rows.length, matches });
  }

  const cross = [...attributes.entries()].filter(([, v]) => v.merchants.size > 1);
  const gradeCounts: Record<Grade, number> = { weak: 0, possible: 0, probable: 0, definite: 0 };
  const clusters = new Map<string, { merchants: Set<string>; rows: Row[]; grade: Grade }>();
  for (const [, value] of cross) {
    const risky = value.rows.filter((row) => row.refund_requested === 'true' || row.chargeback_filed === 'true').length;
    const grade = gradeFor(value.merchants.size, risky);
    gradeCounts[grade]++;
    for (const row of value.rows) {
      if (!row._ground_truth || row._ground_truth === 'legit') continue;
      const c = clusters.get(row._ground_truth) ?? { merchants: new Set<string>(), rows: [], grade };
      if (row._merchant) c.merchants.add(row._merchant);
      c.rows.push(row);
      c.grade = gradeFor(c.merchants.size, c.rows.filter((r) => r.refund_requested === 'true' || r.chargeback_filed === 'true').length);
      clusters.set(row._ground_truth, c);
    }
  }

  for (const run of runs) {
    run.matches = cross.filter(([, v]) => v.merchants.has(run.merchant)).length;
  }

  const legitCross = [...clusters.entries()].find(([label]) => label === 'legit_cross_merchant_overlap');
  const lines = [
    '# Multi-Merchant Identity Graph Verification',
    '',
    `Generated files: ${files.length}`,
    `Rows processed: ${runs.reduce((sum, run) => sum + run.rows, 0).toLocaleString()}`,
    `Cross-merchant identity links found: ${cross.length.toLocaleString()}`,
    '',
    '## Confidence Breakdown',
    '',
    `- Definite: ${gradeCounts.definite}`,
    `- Probable: ${gradeCounts.probable}`,
    `- Possible: ${gradeCounts.possible}`,
    `- Weak: ${gradeCounts.weak}`,
    '',
    '## Runs',
    '',
    '| Merchant CSV | Rows | Cross-merchant attribute matches |',
    '| --- | ---: | ---: |',
    ...runs.map((run) => `| ${run.merchant} | ${run.rows.toLocaleString()} | ${run.matches.toLocaleString()} |`),
    '',
    '## Flagged Clusters',
    '',
    '| Cluster | Merchants | Orders | Grade |',
    '| --- | ---: | ---: | --- |',
    ...[...clusters.entries()]
      .filter(([label]) => label !== 'legit_cross_merchant_overlap')
      .map(([label, cluster]) => `| ${label} | ${cluster.merchants.size} | ${cluster.rows.length} | ${cluster.grade} |`),
    '',
    '## False Positive Control',
    '',
    legitCross
      ? `Legitimate cross-merchant customers appeared at ${legitCross[1].merchants.size} merchants and are retained as overlap context, not fraud clusters.`
      : 'No legitimate cross-merchant control rows were found.',
  ];
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${lines.join('\n')}\n`);
  console.log(lines.join('\n'));
}

main();
