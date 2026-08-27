import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  // Engine eval and deterministic local checks need a non-production fixture
  // salt, but never a real credential. CI may override this with its own test
  // value; deployed environments must provide the validated secret.
  IDENTITY_SALT: process.env.IDENTITY_SALT ?? 'ci-salt-000000000000000000000000000000000000',
  // The checked-in extension bundle is the runtime artifact served by the
  // download route. Keep deterministic CI builds aligned with its canonical
  // production target; local verification may override this explicitly.
  VITE_UNAUTH_API_BASE: process.env.VITE_UNAUTH_API_BASE ?? 'https://app.unauth.co',
  UNAUTH_NEXT_DIST_DIR: process.env.UNAUTH_NEXT_DIST_DIR ?? '.next-ci',
};

const steps = [
  ['authority', ['run', 'verify:authority']],
  ['environment contract', ['run', 'verify:env']],
  ['Vercel cron contract', ['run', 'verify:vercel']],
  ['dead-code candidate report', ['run', 'verify:dead-code']],
  ['surface manifest', ['run', 'verify:surface-manifest']],
  ['UI integrity', ['run', 'verify:ui-integrity']],
  ['merchant copy', ['run', 'verify:merchant-copy']],
  ['migration layout', ['run', 'verify:migration-layout']],
  ['Supabase contract', ['run', 'audit:supabase-contract']],
  ['lint', ['run', 'lint', '--', '--max-warnings=0']],
  ['application typecheck', ['run', 'typecheck']],
  ['script typecheck', ['run', 'typecheck:scripts']],
  ['E2E typecheck', ['run', 'typecheck:e2e']],
  ['Jest', ['test', '--', '--runInBand', '--silent']],
  ['engine eval', ['run', 'eval', '--', 'test-data/realistic_fraud_dataset.csv']],
  ['Chrome extension build', ['run', 'build:extension']],
  ['Next production build', ['run', 'build']],
];

for (const [label, args] of steps) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync('npm', args, { env, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`verify:ci stopped after ${label} (exit ${result.status ?? 'signal'}).`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nPASS verify:ci (${steps.length} deterministic gates; no staging/provider mutations).`);
