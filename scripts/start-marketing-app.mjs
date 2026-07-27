import { spawn } from 'node:child_process';
import { DEFAULT_AS_OF, MARKETING_IDENTITY_SALT, MARKETING_STORY } from './marketing-seed/manifest.mjs';
import { resolveLocalDatabase } from './marketing-seed/local-database.mjs';

let local;
try {
  local = resolveLocalDatabase();
} catch (error) {
  console.error(`FAIL local marketing app guard: ${error.message}`);
  process.exit(1);
}

const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--webpack'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=8192',
      NEXT_PUBLIC_SUPABASE_URL: local.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.anonKey,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: local.serviceRoleKey,
      IDENTITY_SALT: MARKETING_IDENTITY_SALT,
      E2E_MERCHANT_ID: MARKETING_STORY.merchant.id,
      E2E_AUTH_SECRET: 'local-marketing-auth',
      UNAUTH_CLOCK_AS_OF: process.argv.find((arg) => arg.startsWith('--as-of='))?.slice('--as-of='.length) ?? DEFAULT_AS_OF,
    },
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
