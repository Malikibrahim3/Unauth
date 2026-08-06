import { spawnSync } from 'node:child_process';

const remoteMigrations = process.argv.includes('--remote-migrations');
const allowDestructiveLocalReset = process.argv.includes('--allow-destructive-local-reset');
if (remoteMigrations) {
  console.error(
    'Remote migration checks require the later consolidated production approval and are disabled in this local gate.',
  );
  process.exit(2);
}

if (!allowDestructiveLocalReset) {
  console.error(
    'BLOCKED destructive database replay: run this gate only against an approved disposable database and pass --allow-destructive-local-reset.',
  );
  process.exit(2);
}

function localRuntimeEnvironment() {
  const result = spawnSync('supabase', ['status', '-o', 'env'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });
  if (result.status !== 0) {
    throw new Error('Local Supabase status is unavailable; start the isolated local stack');
  }
  const values = Object.fromEntries(
    result.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/"$/, '')]),
  );
  const apiUrl = values.API_URL;
  const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const serviceRole = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (!apiUrl || !anonKey || !serviceRole) {
    throw new Error('Local Supabase status omitted required API credentials');
  }
  const parsed = new URL(apiUrl);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(`Refusing non-local Supabase host ${parsed.hostname}`);
  }
  const inheritedEnvironment = { ...process.env };
  delete inheritedEnvironment.FORCE_COLOR;
  delete inheritedEnvironment.NO_COLOR;
  return {
    ...inheritedEnvironment,
    SUPABASE_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    PLAYWRIGHT_BASE_URL: 'http://localhost:3000',
    E2E_MERCHANT_ID: 'a1000000-0000-4000-8000-000000000010',
    E2E_AUTH_SECRET: 'release-local-browser-only',
    RELEASE_E2E_LOCAL: '1',
    VERCEL_ENV: 'development',
  };
}

let runtimeEnvironment;
try {
  runtimeEnvironment = localRuntimeEnvironment();
  console.log('PASS isolated local Supabase environment');
} catch (error) {
  console.error(`FAIL isolated local Supabase environment: ${error.message}`);
  process.exit(1);
}

const checks = [
  ['Lint (zero warnings)', 'npm', ['run', 'lint', '--', '--max-warnings=0']],
  ['Application TypeScript', 'npm', ['run', 'typecheck']],
  ['Operational script TypeScript', 'npm', ['run', 'typecheck:scripts']],
  ['Provider-suite TypeScript', 'npm', ['run', 'typecheck:e2e']],
  ['Core Jest', 'npm', ['test', '--', '--runInBand', '--silent']],
  ['Engine evaluation', 'npm', ['run', 'eval', '--', 'test-data/realistic_fraud_dataset.csv']],
  ['Supabase contract', 'npm', ['run', 'audit:supabase-contract']],
  ['Active migration layout', 'npm', ['run', 'verify:migration-layout']],
  [
    'Canonical database fresh replay A',
    'npm',
    ['run', 'verify:canonical-db', ...(allowDestructiveLocalReset ? ['--', '--allow-destructive-local-reset'] : [])],
  ],
  ['Required-schema deploy preflight', 'npm', ['run', 'verify:schema-preflight']],
  ['Durable audit PostgreSQL runtime', 'npm', ['run', 'verify:durable-audit-runtime']],
  ['Two-merchant tenant boundary runtime', 'npm', ['run', 'verify:tenant-boundaries']],
  ['Webhook concurrency and replay runtime', 'npm', ['run', 'verify:webhook-event-safety']],
  ['Privacy erasure and retention runtime', 'npm', ['run', 'verify:privacy-erasure']],
  ['Release 1 investigation lifecycle runtime', 'npm', ['run', 'verify:investigations-runtime']],
  ['Source-to-recovery PostgreSQL runtime', 'npm', ['run', 'verify:source-to-recovery']],
  ['Chrome extension build', 'npm', ['run', 'build:extension']],
  ['Production build', 'npm', ['run', 'build']],
  ['Synthetic release browser fixture', 'npm', ['run', 'prepare:release-e2e']],
  ['Canonical route browser smoke', 'npm', ['run', 'test:smoke']],
  ['Whitespace integrity', 'git', ['diff', '--check']],
];

let failed = 0;

for (const [name, command, args] of checks) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: runtimeEnvironment,
  });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

console.log(
  'EXTERNAL remote migration reconciliation intentionally excluded pending the single production approval packet',
);

console.log(
  JSON.stringify({
    status: failed ? 'blocked' : 'ready',
    failedChecks: failed,
    remoteMigrations,
    allowDestructiveLocalReset,
    checkedAt: new Date().toISOString(),
  }),
);
process.exitCode = failed ? 1 : 0;
