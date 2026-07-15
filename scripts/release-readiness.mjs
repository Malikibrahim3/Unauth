import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const remoteMigrations = process.argv.includes('--remote-migrations');
const checks = [
  ['TypeScript', 'npm', ['run', 'typecheck']],
  ['Lint (zero warnings)', 'npm', ['run', 'lint', '--', '--max-warnings=0']],
  ['Authenticated design guard', 'npm', ['run', 'lint:authenticated-design']],
  ['Supabase contract', 'npm', ['run', 'audit:supabase-contract']],
  [
    'Provider-suite TypeScript',
    'npx',
    ['tsc', '--noEmit', '-p', 'scripts/e2e/tsconfig.check.json'],
  ],
  ['Full Jest suite', 'npm', ['test', '--', '--runInBand']],
  ['Production build', 'npm', ['run', 'build']],
  ['Whitespace integrity', 'git', ['diff', '--check']],
];

let failed = 0;

for (const [name, command, args] of checks) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
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

if (remoteMigrations) {
  const result = spawnSync('npx', ['supabase', 'db', 'push', '--dry-run'], {
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    failed += 1;
    console.error('FAIL remote migration dry run');
  } else {
    console.log('PASS remote migration dry run');
  }
} else {
  console.log('SKIP remote migration dry run (pass --remote-migrations for an intentionally linked environment)');
}

console.log(
  JSON.stringify({
    status: failed ? 'blocked' : 'ready',
    failedChecks: failed,
    remoteMigrations,
    checkedAt: new Date().toISOString(),
  }),
);
process.exitCode = failed ? 1 : 0;
