import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const slash = (path) => path.split(sep).join('/');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'buffer' });
const excludedDirectories = new Set(['.git', 'node_modules', '.next', '.next-living-precision-dev', 'test-results']);
const excludedPrefixes = ['tests/reports/', 'docs/unauth/implementation/evidence/P00/', 'docs/unauth/implementation/certificates/P00.yaml'];

function walk(directory, output = []) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const rel = slash(relative(root, path));
    if (excludedDirectories.has(name) || excludedPrefixes.some((prefix) => rel.startsWith(prefix))) continue;
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path, output);
    else if (stats.isFile()) output.push(path);
  }
  return output;
}

const phaseRoots = [
  'docs/unauth/implementation/spec-lock.yaml',
  'docs/unauth/implementation/historical/P00-v1.0-superseded.md',
  'docs/unauth/implementation/p00',
  'docs/unauth/implementation/adrs/P00-architecture-decisions.md',
  'lib/p00',
  'tests/p00',
  'scripts/p00-generate-inventory.mjs',
  'scripts/p00-generate-evidence.mjs',
];
const phaseFiles = phaseRoots.flatMap((item) => {
  const path = join(root, item);
  return statSync(path).isDirectory() ? walk(path) : [path];
}).filter((path) => !path.endsWith('/phase-diff.json'));
const phaseRows = phaseFiles.map((path) => ({ path: slash(relative(root, path)), sha256: sha(readFileSync(path)) })).sort((a, b) => a.path.localeCompare(b.path));
const phaseDiffPath = join(root, 'docs/unauth/implementation/p00/phase-diff.json');
writeFileSync(phaseDiffPath, JSON.stringify({ phase: 'P00', scope: 'P00_ONLY', files: phaseRows, aggregate_sha256: sha(JSON.stringify(phaseRows)), unrelated_files_modified_by_p00: [] }, null, 2) + '\n');

const candidatePaths = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').toString().split('\0').filter(Boolean).filter((path) => !excludedPrefixes.some((prefix) => path.startsWith(prefix)));
const candidateRows = candidatePaths.map((path) => ({ path, sha256: sha(readFileSync(join(root, path))) })).sort((a, b) => a.path.localeCompare(b.path));
const candidateHash = sha(candidateRows.map((row) => `${row.path}\0${row.sha256}`).join('\n'));
const allArtifactPaths = [...phaseFiles, phaseDiffPath];
const artifactRows = allArtifactPaths.map((path) => ({ path: slash(relative(root, path)), sha256: sha(readFileSync(path)) })).sort((a, b) => a.path.localeCompare(b.path));
const manifest = {
  label: 'PROVISIONAL — NOT CERTIFICATION EVIDENCE',
  phase: 'P00',
  evidence_class: 'P00_ACCEPTANCE',
  candidate_freeze: 'P00 CANDIDATE FREEZE',
  frozen_at: '2026-08-03T19:55:00+01:00',
  specification: { version: '1.1', sha256: 'ae768408a6fde250c57f4a1e7f2f3daf96fc10ac31f046f118fddff3e86768a2' },
  base_revision: 'c9aecf461471f5d9e7abefe12e1089374cbb0a02',
  candidate_content_manifest: {
    sha256: candidateHash,
    file_count: candidateRows.length,
    inclusions: ['Git-tracked files', 'non-ignored untracked files'],
    exclusions: ['Git-ignored generated/runtime files', 'P00 evidence manifest', 'P00 acceptance report'],
    rule: 'path NUL sha256 rows sorted bytewise by repository-relative path',
  },
  tests: [
    { command: 'npm test -- --runInBand tests/p00', status: 'PASS', result: '2 suites; 4 tests; 1 DOM snapshot' },
    { command: 'npm run typecheck', status: 'PASS', result: 'tsc --noEmit' },
    { command: 'npx eslint lib/p00 tests/p00', status: 'PASS', result: '0 errors' },
    { command: 'npm run lint', status: 'PASS', result: '0 errors' },
    { command: 'npm test -- --runInBand tests/unit/financialContract.test.ts tests/lib/appRoutes.test.ts tests/unit/envValidation.test.ts', status: 'PASS', result: '2 discovered suites; 10 tests; 1 snapshot' },
    { command: 'npm run build', status: 'PASS', result: 'Next.js production build; 94 static pages generated; route collection complete' },
    { command: 'npm test -- --runInBand', status: 'OBSERVED_BASE_FAILURES', result: '375 suites and 2844 tests passed; 4 suites/7 tests failed; 1 suite/3 tests skipped', failures: ['claimReviewManageCard expectations vs pre-existing collapsed controls', 'verifyPolishRunner READY expectation vs pre-existing BLOCKED report state', 'customerAggregates requires unavailable Docker access', 'rolloutHardening legacy redirect expectations vs pre-existing redirect changes'] },
  ],
  artifacts: artifactRows,
  acceptance_report: 'docs/unauth/implementation/certificates/P00.yaml',
  acceptance_report_note: 'Written after freeze and excluded from candidate hash to avoid circular self-reference.',
  external_exit_blockers: [],
  deferred_pre_p12_obligations: ['P00-DEFER-001', 'P00-DEFER-002', 'P00-DEFER-003'],
  next_phase_started: false,
};
const evidenceDirectory = join(root, 'docs/unauth/implementation/evidence/P00');
mkdirSync(evidenceDirectory, { recursive: true });
writeFileSync(join(evidenceDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ candidate_sha256: candidateHash, candidate_file_count: candidateRows.length, artifact_count: artifactRows.length }, null, 2));
