import { spawnSync } from 'node:child_process';

function localRuntimeEnvironment() {
  const releaseBrowserPort = process.env.RELEASE_E2E_PORT?.trim() || '3016';
  if (!/^\d+$/.test(releaseBrowserPort)) {
    throw new Error('RELEASE_E2E_PORT must be numeric');
  }
  const result = spawnSync('supabase', ['status', '-o', 'env'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });
  if (result.status !== 0) throw new Error('Local Supabase status is unavailable');

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

  const inherited = { ...process.env };
  delete inherited.FORCE_COLOR;
  delete inherited.NO_COLOR;
  return {
    ...inherited,
    SUPABASE_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${releaseBrowserPort}`,
    PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${releaseBrowserPort}`,
    PORT: releaseBrowserPort,
    E2E_MERCHANT_ID: 'a1000000-0000-4000-8000-000000000010',
    E2E_AUTH_SECRET: 'release-local-browser-only',
    RELEASE_E2E_LOCAL: '1',
    VERCEL_ENV: 'development',
  };
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  const env = localRuntimeEnvironment();
  const runnerArgs = process.argv.slice(2);
  const reuseBuild = runnerArgs.includes('--reuse-build');
  const forwardedArgs = runnerArgs.filter((value) => value !== '--reuse-build');
  console.log('PASS isolated local Supabase environment for release-browser suite');
  run('npm', ['run', 'prepare:release-e2e'], env);
  if (!reuseBuild) run('npm', ['run', 'build'], env);
  run('npm', ['run', 'test:release-browser', '--', ...forwardedArgs], env);
} catch (error) {
  console.error(`FAIL local release-browser environment: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
