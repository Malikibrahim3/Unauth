import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const remoteMigrations = process.argv.includes('--remote-migrations');
if (remoteMigrations) {
  console.error(
    'Remote migration checks require the later consolidated production approval and are disabled in this local gate.',
  );
  process.exit(2);
}

function localRuntimeEnvironment() {
  const result = spawnSync('supabase', ['status', '-o', 'env'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
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
  ['TypeScript', 'npm', ['run', 'typecheck']],
  ['Lint (zero warnings)', 'npm', ['run', 'lint', '--', '--max-warnings=0']],
  ['Authenticated design guard', 'npm', ['run', 'lint:authenticated-design']],
  ['Supabase contract', 'npm', ['run', 'audit:supabase-contract']],
  ['Canonical database fresh replay A', 'npm', ['run', 'verify:canonical-db']],
  ['Canonical database fresh replay B', 'npm', ['run', 'verify:canonical-db']],
  ['Durable audit PostgreSQL runtime', 'npm', ['run', 'verify:durable-audit-runtime']],
  ['Two-merchant tenant boundary runtime', 'npm', ['run', 'verify:tenant-boundaries']],
  ['Webhook concurrency and replay runtime', 'npm', ['run', 'verify:webhook-event-safety']],
  ['Privacy erasure and retention runtime', 'npm', ['run', 'verify:privacy-erasure']],
  ['Source-to-recovery PostgreSQL runtime', 'npm', ['run', 'verify:source-to-recovery']],
  ['Atomic P0 evidence ledger', 'npm', ['run', 'verify:p0-ledger']],
  ['Local migration rollout/monitoring/rollback rehearsal', 'npm', ['run', 'verify:rollout-rehearsal']],
  [
    'Provider-suite TypeScript',
    'npx',
    ['tsc', '--noEmit', '-p', 'scripts/e2e/tsconfig.check.json'],
  ],
  ['Full Jest suite', 'npm', ['test', '--', '--runInBand', '--silent']],
  ['Production build', 'npm', ['run', 'build']],
  ['Synthetic release browser fixture', 'npm', ['run', 'prepare:release-e2e']],
  ['Production browser, lifecycle, accessibility and performance suite', 'npm', ['run', 'test:release-browser']],
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

const migrationFiles = readdirSync('supabase/migrations').filter((file) =>
  /^\d{14}_.+\.sql$/.test(file),
);
const timestamps = migrationFiles.map((file) => file.slice(0, 14));
const duplicateTimestamps = timestamps.filter(
  (timestamp, index) => timestamps.indexOf(timestamp) !== index,
);

if (migrationFiles.length === 0 || duplicateTimestamps.length > 0) {
  failed += 1;
  console.error(
    duplicateTimestamps.length > 0
      ? `FAIL duplicate migration timestamps: ${[...new Set(duplicateTimestamps)].join(', ')}`
      : 'FAIL no timestamped migrations found',
  );
} else {
  console.log(`PASS migration history (${migrationFiles.length} timestamped files)`);
}

console.log(
  'EXTERNAL remote migration reconciliation intentionally excluded pending the single production approval packet',
);

console.log(
  JSON.stringify({
    status: failed ? 'blocked' : 'ready',
    failedChecks: failed,
    remoteMigrations,
    checkedAt: new Date().toISOString(),
  }),
);
process.exitCode = failed ? 1 : 0;
