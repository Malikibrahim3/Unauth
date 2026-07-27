/**
 * Phase 1 QA fixture validator (deliverable 9).
 *
 * Fail-closed. Every assertion below exists because a Phase 1 success metric
 * depends on the state it checks, so a silently missing fixture row must break
 * the gate rather than produce a quietly weaker proof.
 *
 * Emits docs/phase-reports/product-polish/evidence/phase-01-fixture-matrix.json,
 * which the Phase 1 manifest requires.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { buildFixture, fingerprint, DEFAULT_AS_OF, MERCHANT_ID, OTHER_MERCHANT_ID, STATE_MATRIX, CAPTURE_KEYS } from './phase1-qa/fixture.mjs';
import { createHash } from 'node:crypto';

const asOf = process.argv.find((arg) => arg.startsWith('--as-of='))?.slice('--as-of='.length) ?? DEFAULT_AS_OF;
const EVIDENCE_DIR = 'docs/phase-reports/product-polish/evidence';
const OUTPUT = `${EVIDENCE_DIR}/phase-01-fixture-matrix.json`;

const projectId = readFileSync('supabase/config.toml', 'utf8').match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
if (!projectId) throw new Error('Could not resolve a local project_id from supabase/config.toml');
const container = `supabase_db_${projectId}`;

function sql(statement) {
  const result = spawnSync(
    'docker',
    ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', statement],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, shell: false },
  );
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || '').trim());
  return (result.stdout ?? '').trim();
}

const problems = [];
const checks = {};

function expect(key, actual, expected, note) {
  const ok = String(actual) === String(expected);
  checks[key] = { expected: String(expected), actual: String(actual), pass: ok, note };
  if (!ok) problems.push(`${key}: expected ${expected}, received ${actual}${note ? ` (${note})` : ''}`);
  return ok;
}

const M = `'${MERCHANT_ID}'`;

/* -- the state matrix each RUN requirement depends on ---------------------- */

expect('completeCase', sql(`select count(*) from support_payout_cases where id='${CAPTURE_KEYS.completeCase}' and merchant_id=${M}`), 1);
expect(
  'resolvedMatch',
  sql(`select count(*) from case_claimed_items where support_payout_case_id='${CAPTURE_KEYS.completeCase}' and match_status='confirmed' and source_order_line_id is not null`),
  1,
  'RUN-03 resolved match must point at a real source order line',
);
expect(
  'unambiguousMatch',
  sql(`select count(*) from case_claimed_items where support_payout_case_id='${CAPTURE_KEYS.unambiguousMatchCase}' and match_status='unmatched'`),
  1,
  'RUN-03 unambiguous candidate awaiting one obvious action',
);
expect(
  'unambiguousMatchHasExactlyOneCandidateLine',
  sql(`select count(*) from source_order_lines where source_order_id=(select source_order_id from support_payout_cases where id='${CAPTURE_KEYS.unambiguousMatchCase}')`),
  1,
  'ambiguity would make the match a judgement call rather than an unambiguous one',
);
expect('savedWorkView', sql(`select count(*) from work_saved_views where merchant_id=${M} and deleted_at is null`), 1);
expect(
  'trueEmptyWorkView',
  sql(`select count(*) from work_saved_views where merchant_id='${OTHER_MERCHANT_ID}' and deleted_at is null`),
  0,
  'the isolation merchant is the genuine "no saved views" case',
);
expect(
  'investigationResolvedPartner',
  sql(`select count(*) from case_clarification_requests c join partners p on p.id=c.partner_id and p.merchant_id=c.merchant_id where c.merchant_id=${M}`),
  1,
);
expect(
  'investigationMissingPartner',
  sql(`select count(*) from case_clarification_requests where merchant_id=${M} and partner_id is null`),
  1,
  'RUN-02 history must survive a partner that no longer resolves',
);
expect('knownZero', sql(`select count(*) from support_payout_cases where id='${CAPTURE_KEYS.knownZeroCase}' and amount_at_risk=0 and currency is not null`), 1);
expect(
  'unavailable',
  sql(`select count(*) from source_customers where merchant_id=${M} and total_spent is null`),
  1,
  'RUN-17 unavailable aggregate, distinct from a known zero',
);
expect('missingCurrency', sql(`select count(*) from support_payout_cases where id='${CAPTURE_KEYS.missingCurrencyCase}' and currency is null`), 1);
expect(
  'mixedCurrency',
  sql(`select count(distinct currency) from support_payout_cases where merchant_id=${M} and currency is not null`),
  2,
  'RUN-09/16/21 need at least two currencies so single-currency sums must exclude',
);
expect(
  'missingSource',
  sql(`select count(*) from support_payout_cases where id='${CAPTURE_KEYS.missingSourceCase}' and source_order_id is null and source_ticket_id is null`),
  1,
);
expect(
  'timezoneBoundary',
  sql(`select count(*) from support_payout_cases where id='${CAPTURE_KEYS.timezoneBoundaryCase}' and extract(hour from created_at at time zone 'UTC')=23`),
  1,
);
expect('dueToday', sql(`select count(*) from support_payout_cases where id='${CAPTURE_KEYS.dueTodayCase}'`), 1);
expect('overdue', sql(`select count(*) from support_payout_cases where id='${CAPTURE_KEYS.overdueCase}'`), 1);
expect(
  'impossibleState',
  sql(`select count(*) from support_payout_cases where id='${CAPTURE_KEYS.impossibleStateCase}' and recoverability='not_recoverable' and recovery_owner='carrier'`),
  1,
  'RUN-18/20 assertions must reject this combination rather than render it as healthy',
);
expect(
  'evidencePackageForRegistry',
  sql(`select count(*) from evidence_packages where merchant_id=${M} and generated_for_order_id='${CAPTURE_KEYS.heroOrder}'`),
  1,
  'RUN-08 registry/detail agreement needs a case that genuinely has a package',
);

/* -- isolation and hygiene ------------------------------------------------- */

expect(
  'merchantIsolationControl',
  sql(`select count(*) from support_payout_cases where merchant_id='${OTHER_MERCHANT_ID}'`),
  1,
  'a second merchant exists so isolation assertions have something to fail against',
);
expect(
  'noFixtureRowsOutsideNamespace',
  sql(`select count(*) from support_payout_cases where merchant_id in (${M}, '${OTHER_MERCHANT_ID}') and id::text not like 'f1%'`),
  0,
);

/* -- every declared matrix entry must be checked --------------------------- */

const uncovered = STATE_MATRIX.filter((entry) => !entry.runtimeInjected && !(entry.key in checks)).map((entry) => entry.key);
if (uncovered.length) problems.push(`state matrix entries with no assertion: ${uncovered.join(', ')}`);

/*
 * Runtime-injected states cannot be asserted against the database. They are
 * still owned, so the validator refuses to pass until the injection artifact
 * that evidences them exists.
 */
for (const entry of STATE_MATRIX.filter((candidate) => candidate.runtimeInjected)) {
  const artifact = `${EVIDENCE_DIR}/phase-01-completeness-injection.json`;
  checks[entry.key] = { expected: `evidenced by ${artifact}`, actual: existsSync(artifact) ? 'artifact present' : 'artifact absent', pass: existsSync(artifact) };
  if (!existsSync(artifact)) {
    problems.push(`${entry.key}: runtime-injected state requires ${artifact}, which does not exist yet`);
  }
}

const fixture = buildFixture(asOf);
const fingerprintHash = createHash('sha256').update(fingerprint(fixture)).digest('hex');

mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(
  OUTPUT,
  `${JSON.stringify(
    {
      artifact: 'phase-01-fixture-matrix',
      generatedFrom: 'npm run validate:phase1-qa',
      target: container,
      asOf,
      fixtureVersion: fixture.version,
      fingerprint: fingerprintHash,
      merchantId: MERCHANT_ID,
      captureKeys: CAPTURE_KEYS,
      stateMatrix: STATE_MATRIX,
      checks,
      pass: problems.length === 0,
      problems,
    },
    null,
    2,
  )}\n`,
);

if (problems.length) {
  console.error(`FAIL Phase 1 QA fixture validation (${problems.length} problems)`);
  for (const problem of problems) console.error(`  · ${problem}`);
  console.error(`\nWrote ${OUTPUT} with the failing detail.`);
  process.exit(1);
}

console.log(`PASS Phase 1 QA fixture validation (${Object.keys(checks).length} assertions, fingerprint ${fingerprintHash.slice(0, 12)}…).`);
console.log(`Wrote ${OUTPUT}`);
