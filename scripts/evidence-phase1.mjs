/**
 * Phase 1 runtime evidence runner.
 *
 * Seeds the guarded QA fixture, builds and starts the production application
 * against the isolated local Supabase stack, then runs the Playwright evidence
 * project that writes the four artifacts the Phase 1 manifest requires.
 *
 * Everything here targets the local container only; the environment is built
 * from `supabase status`, never from `.env.local`, which points at a hosted
 * project in this repository.
 */
import { spawnSync, spawn } from 'node:child_process';
import { MERCHANT_ID } from './phase1-qa/fixture.mjs';

const skipBuild = process.argv.includes('--skip-build');

function localEnvironment() {
  const status = spawnSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8', shell: false });
  if (status.status !== 0) throw new Error('Local Supabase is not running; start it with `supabase start`');
  const values = Object.fromEntries(
    status.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/"$/, '')]),
  );
  const apiUrl = values.API_URL;
  if (!apiUrl || !['127.0.0.1', 'localhost', '::1'].includes(new URL(apiUrl).hostname)) {
    throw new Error(`Refusing non-local Supabase host ${apiUrl}`);
  }
  const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const serviceRole = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  return {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    PLAYWRIGHT_BASE_URL: 'http://localhost:3000',
    E2E_MERCHANT_ID: MERCHANT_ID,
    E2E_AUTH_SECRET: 'phase1-qa-local-browser-only',
    VERCEL_ENV: 'development',
    NODE_ENV: 'production',
  };
}

let environment;
try {
  environment = localEnvironment();
  console.log('PASS isolated local environment');
} catch (error) {
  console.error(`FAIL isolated local environment: ${error.message}`);
  process.exit(1);
}

function run(label, command, args, env = environment) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, env });
  if (result.status !== 0) {
    console.error(`FAIL ${label}`);
    process.exit(result.status ?? 1);
  }
  console.log(`PASS ${label}`);
}

run('Phase 1 QA fixture seed', 'npm', ['run', 'seed:phase1-qa', '--', '--reset']);

if (!skipBuild) {
  run('Production build', 'npm', ['run', 'build'], { ...environment, NODE_ENV: 'production' });
}

const server = spawn('npm', ['run', 'start'], { env: environment, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://localhost:3000/login', { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Production server did not start within 120s:\n${serverLog.slice(-2000)}`);
}

let exitCode = 0;
try {
  await waitForServer();
  console.log('PASS production server ready');
  const result = spawnSync(
    'npx',
    ['playwright', 'test', '--config=tests/phase1/playwright.config.ts', ...process.argv.filter((arg) => arg.startsWith('--grep')).flatMap((arg) => arg.split('='))],
    { stdio: 'inherit', shell: false, env: environment },
  );
  exitCode = result.status ?? 1;
  console.log(exitCode === 0 ? 'PASS Phase 1 runtime evidence' : 'FAIL Phase 1 runtime evidence');
} catch (error) {
  console.error(`FAIL ${error.message}`);
  exitCode = 1;
} finally {
  server.kill('SIGTERM');
}

process.exit(exitCode);
