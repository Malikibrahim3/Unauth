import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { acceptanceRuntimeEnvironment } from './acceptance/local-runtime.mjs';
import { REMAINING_CLOSURE_ROOT } from './acceptance/remaining-closure-runtime.mjs';

const host = '127.0.0.1';
const port = process.env.REMAINING_CLOSURE_PORT?.trim() || '3021';
const password = process.env.RELEASE_ROLE_PASSWORD?.trim() || randomBytes(32).toString('base64url');
const env = {
  ...acceptanceRuntimeEnvironment({ host, port }),
  RELEASE_ROLE_PASSWORD: password,
  PLAYWRIGHT_REUSE_SERVER: '1',
};
const fixturePlanPath = path.join(process.cwd(), REMAINING_CLOSURE_ROOT, 'fixture-plan.json');

function run(script, args = []) {
  const result = spawnSync('npm', ['run', script, ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env,
  });
  if (result.status !== 0) throw new Error(`${script} failed`);
}

async function waitUntilReady() {
  const baseUrl = `http://${host}:${port}`;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      // The acceptance server is still starting; keep the bounded retry local.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Remaining-closure acceptance server did not become ready within 120 seconds');
}

let server;
let rolePrepared = false;
let primaryFailure = null;
const cleanupFailures = [];

try {
  run('prepare:role-acceptance');
  rolePrepared = true;
  run('prepare:remaining-closure');
  // The e2e-auth route is allow-listed by merchant ID. Add only the three
  // exact, freshly prepared fixture IDs to that allow-list; never widen it to
  // arbitrary local merchants.
  const preparedPlan = JSON.parse(fs.readFileSync(fixturePlanPath, 'utf8'));
  const remainingMerchantIds = Object.values(preparedPlan.fixtures ?? {})
    .map((fixture) => fixture?.merchantId)
    .filter((merchantId) => typeof merchantId === 'string');
  env.E2E_ALLOWED_MERCHANT_IDS = remainingMerchantIds.join(',');
  // npm requires the separator before forwarding the cleanup flag to the
  // underlying script; without it npm treats --dry-run as its own option and
  // would delete the fixtures before the browser matrix starts.
  run('cleanup:remaining-closure', ['--', '--dry-run']);

  server = spawn('npm', ['run', 'start:acceptance', '--', '--host', host, '--port', port], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env,
  });
  await waitUntilReady();

  for (const script of [
    'test:full-app-p06-remaining-states',
    'test:full-app-p06-mutations',
    'test:full-app-p06-privacy-mutations',
    'test:full-app-p06-billing-mutation',
    'test:full-app-pricing-plan-unavailable',
    'test:full-app-root-not-found',
  ]) run(script);
  run('acceptance:physical-index:remaining');
  run('acceptance:map:remaining');
  run('verify:full-acceptance-evidence:remaining');
  const detectorReceipt = path.join(process.cwd(), REMAINING_CLOSURE_ROOT, 'impeccable', 'receipt.json');
  if (!fs.existsSync(detectorReceipt)) run('acceptance:impeccable-final');
} catch (error) {
  primaryFailure = error instanceof Error ? error : new Error(String(error));
} finally {
  if (server && !server.killed) server.kill('SIGTERM');

  // The plan is written before fixture creation. Invoking cleanup whenever it
  // exists gives a partial setup the same exact-ID/marker protection as a
  // successful run, while never broadening deletion scope.
  if (fs.existsSync(fixturePlanPath)) {
    try {
      run('cleanup:remaining-closure');
    } catch (error) {
      cleanupFailures.push(`cleanup:remaining-closure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (rolePrepared) {
    try {
      run('cleanup:role-acceptance');
    } catch (error) {
      cleanupFailures.push(`cleanup:role-acceptance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (primaryFailure) throw primaryFailure;
if (cleanupFailures.length) throw new Error(cleanupFailures.join('; '));
