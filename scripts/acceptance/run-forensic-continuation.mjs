import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { acceptanceRuntimeEnvironment, runtimeSourceFingerprint } from './local-runtime.mjs';

// A dated evidence wrapper around existing tests, not a new acceptance owner.
const root = process.cwd();
const audit = path.join(root, 'artifacts/merchant-clarity-implementation/2026-09-09-ui-forensics-01/P12/ui-forensics');
const specs = process.argv.slice(2);
const allowed = new Set(['forensic-cases-pagination', 'full-app-p03-states', 'full-app-p04-states', 'full-app-p05-states', 'full-app-p02-workflows', 'full-app-p02-investigations', 'full-app-p02-delivery-photo', 'full-app-p02-decisions', 'full-app-p03-mutations', 'full-app-p04-workflows', 'full-app-p05-workflows', 'full-app-shared-states']);
allowed.add('full-app-p06-remaining-states');
allowed.add('accessibility-responsive');
allowed.add('full-app-p07-entry');
allowed.add('forensic-cases-filters');
allowed.add('forensic-connected-records');
allowed.add('forensic-adapters');
allowed.add('forensic-privacy-boundaries');
allowed.add('forensic-lower-controls');
allowed.add('full-app-p07-auth');
allowed.add('forensic-privacy-receipts');
allowed.add('forensic-resolution-comparison');
allowed.add('forensic-demo-journeys');
allowed.add('forensic-onboarding');
if (!specs.length || specs.some(s => !allowed.has(s))) throw new Error('Select an explicit supported forensic suite.');
const env = acceptanceRuntimeEnvironment({ port: '3016' });
const fingerprint = runtimeSourceFingerprint(root);
const buildId = fs.readFileSync('.next/BUILD_ID', 'utf8').trim();
const build = JSON.parse(fs.readFileSync('artifacts/full-app-acceptance-2026-08-30/build-environment.json', 'utf8'));
if (build.status !== 'passed' || !build.sourceStable || build.runtimeSourceFingerprint !== fingerprint || build.buildId !== buildId) throw new Error('Current source/build mismatch.');
const run = path.join(audit, 'continuations', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(run, { recursive: true });
const shared = path.join(root, 'artifacts/full-app-acceptance-2026-08-30/scenarios');
// These suites write artifacts solely into this run's Playwright output.
// Database scope is enforced separately by their fixture guards.
const noSharedScenarioWrites = specs.filter(spec => ['forensic-privacy-boundaries', 'forensic-lower-controls', 'forensic-privacy-receipts', 'forensic-resolution-comparison', 'forensic-demo-journeys', 'forensic-onboarding'].includes(spec));
if (noSharedScenarioWrites.length !== specs.length) fs.cpSync(shared, path.join(run, 'before-scenarios'), { recursive: true });
const baseline = { buildId, runtimeSourceFingerprint: fingerprint, browser: env.UNAUTH_FORENSIC_BROWSER || 'chromium', startedAt: new Date().toISOString(), appOrigin: env.PLAYWRIGHT_BASE_URL, supabaseEndpoint: env.NEXT_PUBLIC_SUPABASE_URL, allowedAuthMerchants: [env.E2E_MERCHANT_ID, ...(env.E2E_ALLOWED_MERCHANT_IDS || '').split(',')].filter(Boolean), specs, noSharedScenarioWrites, results: [] };
fs.writeFileSync(path.join(run, 'run.json'), JSON.stringify(baseline, null, 2) + '\n');
async function execute(command, args, label) {
  const file = fs.createWriteStream(path.join(run, `${label}.log`));
  const child = spawn(command, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const redact = value => String(value).replaceAll(env.E2E_AUTH_SECRET, '[local-auth-redacted]').replaceAll(env.SUPABASE_SERVICE_ROLE_KEY, '[redacted]').replaceAll(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, '[redacted]');
  for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { const text = redact(bytes); file.write(text); process.stdout.write(text); });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  await new Promise(resolve => file.end(resolve));
  baseline.results.push({ command, args, code, completedAt: new Date().toISOString(), log: `${label}.log` });
  fs.writeFileSync(path.join(run, 'run.json'), JSON.stringify(baseline, null, 2) + '\n');
  return code;
}
console.log(`Evidence: ${path.relative(root, run)}`);
// Existing preparation validates the exact marked local release fixture.
if (await execute('npm', ['run', 'prepare:release-e2e'], 'prepare') !== 0) process.exit(1);
let failed = false;
const needsFreshPrivacyFixture = specs.some(spec => ['forensic-privacy-receipts','forensic-resolution-comparison','forensic-onboarding'].includes(spec));
if (needsFreshPrivacyFixture) {
  env.UNAUTH_REMAINING_CLOSURE_ROOT = path.relative(root, path.join(run, 'remaining-fixture'));
  baseline.disposableFixtureRoot = env.UNAUTH_REMAINING_CLOSURE_ROOT;
}
try {
if (needsFreshPrivacyFixture) {
  if (await execute('node', ['scripts/acceptance/prepare-remaining-closure.mjs'], 'prepare-disposable') !== 0) throw new Error('Disposable fixture preparation failed.');
  const plan = JSON.parse(fs.readFileSync(path.join(env.UNAUTH_REMAINING_CLOSURE_ROOT, 'fixture-plan.json'), 'utf8'));
  env.E2E_ALLOWED_MERCHANT_IDS = Object.values(plan.fixtures).map(item => item.merchantId).join(',');
  baseline.allowedAuthMerchants = [env.E2E_MERCHANT_ID, ...env.E2E_ALLOWED_MERCHANT_IDS.split(',')];
}
for (const spec of specs) {
  const grep = process.env.UNAUTH_FORENSIC_GREP?.trim();
  const code = await execute('./node_modules/.bin/playwright', ['test', '--config=tests/playwright.config.ts', '--project=desktop', `--output=${path.join(run, 'test-results', spec)}`, ...(grep ? ['--grep', grep] : []), `tests/current/${spec}.spec.ts`], spec);
  failed ||= code !== 0;
  if (fs.existsSync('tests/reports/results.json')) fs.copyFileSync('tests/reports/results.json', path.join(run, `${spec}.results.json`));
  if (!noSharedScenarioWrites.includes(spec)) fs.cpSync(shared, path.join(run, 'after', spec), { recursive: true });
  if (runtimeSourceFingerprint(root) !== fingerprint) throw new Error('Runtime changed during testing; stop evidence promotion.');
}
} finally {
  if (needsFreshPrivacyFixture && fs.existsSync(path.join(env.UNAUTH_REMAINING_CLOSURE_ROOT, 'fixture-plan.json'))) {
    const cleanup = await execute('node', ['scripts/acceptance/cleanup-remaining-closure.mjs'], 'cleanup-disposable');
    failed ||= cleanup !== 0;
    baseline.disposableCleanupPassed = cleanup === 0;
  }
}
baseline.completedAt = new Date().toISOString();
baseline.runtimeUnchanged = runtimeSourceFingerprint(root) === fingerprint;
fs.writeFileSync(path.join(run, 'run.json'), JSON.stringify(baseline, null, 2) + '\n');
process.exitCode = failed ? 1 : 0;
