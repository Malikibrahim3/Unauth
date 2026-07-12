import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const merchantId = process.env.RECONCILIATION_SMOKE_MERCHANT_ID ?? process.env.E2E_MERCHANT_ID;
if (!merchantId) {
  throw new Error('Set RECONCILIATION_SMOKE_MERCHANT_ID or E2E_MERCHANT_ID to a safe test merchant.');
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error('Could not reserve a local port for the reconciliation smoke test.');
  return port;
}

async function waitForServer(url, child, output) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next server exited before becoming ready.\n${output()}`);
    }
    try {
      await fetch(`${url}/login`, { redirect: 'manual' });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Timed out waiting for the Next server.\n${output()}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const secret = randomBytes(32).toString('hex');
const nextBin = new URL('../node_modules/next/dist/bin/next', import.meta.url).pathname;
let serverOutput = '';
const child = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', String(port)], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, CRON_SECRET: secret },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-8_000); });
child.stderr.on('data', (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-8_000); });

try {
  await waitForServer(baseUrl, child, () => serverOutput);
  const endpoint = `${baseUrl}/api/cron/reconcile?merchantId=${encodeURIComponent(merchantId)}`;

  const missing = await fetch(endpoint);
  const invalid = await fetch(endpoint, { headers: { authorization: 'Bearer invalid' } });
  assert(missing.status === 401, `Missing authorization returned ${missing.status}, expected 401.`);
  assert(invalid.status === 401, `Invalid authorization returned ${invalid.status}, expected 401.`);

  const authorization = { authorization: `Bearer ${secret}` };
  const first = await fetch(endpoint, { headers: authorization });
  const firstBody = await first.json();
  assert(first.status === 200, `First authorized sweep returned ${first.status}: ${JSON.stringify(firstBody)}`);
  assert(firstBody.merchantsSwept === 1, `First sweep processed ${firstBody.merchantsSwept} merchants, expected 1.`);
  assert(firstBody.failureCount === 0, `First sweep reported ${firstBody.failureCount} failures.`);

  const repeated = await fetch(endpoint, { headers: authorization });
  const repeatedBody = await repeated.json();
  assert(repeated.status === 200, `Repeated sweep returned ${repeated.status}: ${JSON.stringify(repeatedBody)}`);
  assert(repeatedBody.merchantsSwept === 1, `Repeated sweep processed ${repeatedBody.merchantsSwept} merchants, expected 1.`);
  assert(repeatedBody.failureCount === 0, `Repeated sweep reported ${repeatedBody.failureCount} failures.`);
  assert(repeatedBody.exceptionsRaised === 0, `Repeated sweep raised ${repeatedBody.exceptionsRaised} new exceptions, expected 0.`);

  console.log(JSON.stringify({
    missingAuthorizationStatus: missing.status,
    invalidAuthorizationStatus: invalid.status,
    firstSweep: {
      status: first.status,
      merchantsSwept: firstBody.merchantsSwept,
      exceptionsRaised: firstBody.exceptionsRaised,
      failureCount: firstBody.failureCount,
    },
    repeatedSweep: {
      status: repeated.status,
      merchantsSwept: repeatedBody.merchantsSwept,
      exceptionsRaised: repeatedBody.exceptionsRaised,
      failureCount: repeatedBody.failureCount,
    },
  }, null, 2));
} finally {
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
