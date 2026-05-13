import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';

type Row = Record<string, unknown>;

type Args = {
  source: string;
  answers: string;
  audit: string;
  out?: string;
  sourceIdCol: string;
  answerIdCol: string;
  auditIdCol: string;
  answerFlagCol: string;
  answersExhaustive: boolean;
  minRecall?: number;
  minPrecision?: number;
  maxReviewRate?: number;
};

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    map.set(key, value);
  }

  const source = map.get('source');
  const answers = map.get('answers');
  const audit = map.get('audit');
  if (!source || !answers || !audit) {
    throw new Error('Usage: --source <csv> --answers <csv> --audit <csv> [--out <json>]');
  }

  return {
    source,
    answers,
    audit,
    out: map.get('out'),
    sourceIdCol: map.get('source-id-col') ?? 'order_id',
    answerIdCol: map.get('answer-id-col') ?? 'order_id',
    auditIdCol: map.get('audit-id-col') ?? 'order_id',
    answerFlagCol: map.get('answer-flag-col') ?? 'expected_flag',
    answersExhaustive: (map.get('answers-exhaustive') ?? 'true').toLowerCase() === 'true',
    minRecall: map.has('min-recall') ? Number(map.get('min-recall')) : undefined,
    minPrecision: map.has('min-precision') ? Number(map.get('min-precision')) : undefined,
    maxReviewRate: map.has('max-review-rate') ? Number(map.get('max-review-rate')) : undefined,
  };
}

function readCsv(filePath: string): Row[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    throw new Error(`Failed to parse CSV ${filePath}: ${parsed.errors[0].message}`);
  }
  return parsed.data;
}

function boolFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const v = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y'].includes(v);
}

function stringVal(value: unknown): string {
  return String(value ?? '').trim();
}

function reviewFlag(row: Row): boolean {
  const matchStatus = stringVal(row.match_status).toLowerCase();
  const hasIdentityLink =
    matchStatus !== '' && matchStatus !== 'none' ||
    stringVal(row.cluster_id) !== '' ||
    stringVal(row.candidate_cluster_id) !== '' ||
    stringVal(row.confirmed_identity_id) !== '';
  return hasIdentityLink;
}

function divide(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const sourceRows = readCsv(args.source);
  const answerRows = readCsv(args.answers);
  const auditRows = readCsv(args.audit);

  const sourceIds = new Set(sourceRows.map((r) => stringVal(r[args.sourceIdCol])).filter(Boolean));
  const expectedPositiveIds = new Set(
    answerRows
      .filter((r) => boolFlag(r[args.answerFlagCol]))
      .map((r) => stringVal(r[args.answerIdCol]))
      .filter(Boolean)
  );
  const auditById = new Map<string, Row>();
  for (const row of auditRows) {
    const id = stringVal(row[args.auditIdCol]);
    if (!id) continue;
    if (!auditById.has(id)) auditById.set(id, row);
  }

  const predictedPositiveIds = new Set<string>();
  for (const [id, row] of auditById.entries()) {
    if (reviewFlag(row)) predictedPositiveIds.add(id);
  }

  const tpIds = [...predictedPositiveIds].filter((id) => expectedPositiveIds.has(id));
  const fnIds = [...expectedPositiveIds].filter((id) => !predictedPositiveIds.has(id));

  let fpIds: string[] = [];
  let tnCount = 0;
  if (args.answersExhaustive) {
    fpIds = [...predictedPositiveIds].filter((id) => sourceIds.has(id) && !expectedPositiveIds.has(id));
    const predictedNegativeIds = [...sourceIds].filter((id) => !predictedPositiveIds.has(id));
    tnCount = predictedNegativeIds.filter((id) => !expectedPositiveIds.has(id)).length;
  }

  const tp = tpIds.length;
  const fn = fnIds.length;
  const fp = fpIds.length;
  const precision = divide(tp, tp + fp);
  const recall = divide(tp, tp + fn);
  const f1 = divide(2 * precision * recall, precision + recall);
  const reviewRate = divide(predictedPositiveIds.size, sourceIds.size);

  const byMatchStatus: Record<string, number> = {};
  const byGrade: Record<string, number> = {};
  const bySignals: Record<string, number> = {};
  for (const id of fpIds) {
    const row = auditById.get(id);
    if (!row) continue;
    const status = stringVal(row.match_status) || 'NULL';
    const grade = stringVal(row.identity_match_grade) || 'NULL';
    const signals = stringVal(row.signals_matched) || 'NULL';
    byMatchStatus[status] = (byMatchStatus[status] ?? 0) + 1;
    byGrade[grade] = (byGrade[grade] ?? 0) + 1;
    bySignals[signals] = (bySignals[signals] ?? 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    files: {
      source: path.resolve(args.source),
      answers: path.resolve(args.answers),
      audit: path.resolve(args.audit),
    },
    counts: {
      sourceRows: sourceRows.length,
      sourceUniqueIds: sourceIds.size,
      answerRows: answerRows.length,
      expectedPositives: expectedPositiveIds.size,
      auditRows: auditRows.length,
      auditUniqueIds: auditById.size,
      predictedPositives: predictedPositiveIds.size,
    },
    metrics: {
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      trueNegatives: tnCount,
      precision,
      recall,
      f1,
      reviewRate,
    },
    failures: {
      falsePositiveIds: fpIds.slice(0, 5000),
      falseNegativeIds: fnIds.slice(0, 5000),
      falsePositiveBreakdown: {
        byMatchStatus,
        byIdentityGrade: byGrade,
        bySignalsTop20: Object.entries(bySignals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .reduce<Record<string, number>>((acc, [k, v]) => {
            acc[k] = v;
            return acc;
          }, {}),
      },
    },
  };

  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify(report.metrics, null, 2));

  const thresholdFailures: string[] = [];
  if (typeof args.minRecall === 'number' && recall < args.minRecall) {
    thresholdFailures.push(`recall ${recall.toFixed(4)} < min-recall ${args.minRecall}`);
  }
  if (typeof args.minPrecision === 'number' && precision < args.minPrecision) {
    thresholdFailures.push(`precision ${precision.toFixed(4)} < min-precision ${args.minPrecision}`);
  }
  if (typeof args.maxReviewRate === 'number' && reviewRate > args.maxReviewRate) {
    thresholdFailures.push(`reviewRate ${reviewRate.toFixed(4)} > max-review-rate ${args.maxReviewRate}`);
  }
  if (thresholdFailures.length > 0) {
    throw new Error(`Threshold check failed: ${thresholdFailures.join('; ')}`);
  }
}

main();

