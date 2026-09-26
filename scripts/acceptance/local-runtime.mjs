import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const ACCEPTANCE_ROOT = 'artifacts/full-app-acceptance-2026-08-30';
export const ACCEPTANCE_FIXTURE = 'full-app-acceptance-2026-08-30';
export const ACCEPTANCE_MERCHANT_ID = 'a1000000-0000-4000-8000-000000000010';

/** Hash runtime inputs, not git status labels: editing an already-dirty file
 * must invalidate a previously built visual receipt. No environment files. */
export function runtimeSourceFingerprint(root = process.cwd()) {
  const hash = createHash('sha256');
  function read(relative) {
    hash.update(relative);
    hash.update('\0');
    hash.update(readFileSync(path.join(root, relative)));
    hash.update('\0');
  }
  function walk(relative) {
    if (!existsSync(path.join(root, relative))) return;
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue;
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) read(child);
    }
  }
  for (const directory of ['app', 'components', 'lib', 'styles', 'public']) walk(directory);
  for (const file of ['package.json', 'package-lock.json', 'next.config.js', 'tsconfig.json', 'postcss.config.js', 'postcss.config.mjs', 'middleware.ts', 'proxy.ts']) {
    if (existsSync(path.join(root, file))) read(file);
  }
  return hash.digest('hex');
}

export function isLoopbackHostname(hostname) {
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname);
}

export function assertLoopbackUrl(value, label) {
  const parsed = new URL(value);
  if (!isLoopbackHostname(parsed.hostname)) {
    throw new Error(`${label} must use a loopback host; received ${parsed.hostname}`);
  }
  return parsed;
}

export function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function requireRolePassword() {
  const password = requiredEnvironment('RELEASE_ROLE_PASSWORD');
  if (password.length < 24) {
    throw new Error('RELEASE_ROLE_PASSWORD must contain at least 24 characters');
  }
  return password;
}

export function localSupabaseEnvironment() {
  const requestedWorkdir = process.env.ACCEPTANCE_SUPABASE_WORKDIR?.trim();
  const statusWorkdir = requestedWorkdir || process.cwd();
  if (requestedWorkdir && (!path.isAbsolute(statusWorkdir) || !existsSync(path.join(statusWorkdir, 'supabase', 'config.toml')))) {
    throw new Error('ACCEPTANCE_SUPABASE_WORKDIR must be an absolute local Supabase project directory');
  }
  const status = spawnSync('supabase', ['status', '-o', 'env'], {
    cwd: statusWorkdir,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });
  if (status.status !== 0) throw new Error('Local Supabase status is unavailable');
  const values = Object.fromEntries(
    status.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/"$/, '')]),
  );
  const apiUrl = values.API_URL;
  const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const serviceRole = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (!apiUrl || !anonKey || !serviceRole) {
    throw new Error('Local Supabase status omitted required credentials');
  }
  assertLoopbackUrl(apiUrl, 'Supabase URL');
  return { values, apiUrl: apiUrl.replace(/\/$/, ''), anonKey, serviceRole };
}

export function acceptanceRuntimeEnvironment({ host = '127.0.0.1', port = '3016' } = {}) {
  if (!isLoopbackHostname(host)) throw new Error(`Refusing non-loopback host ${host}`);
  if (!/^\d+$/.test(String(port))) throw new Error('Port must be numeric');
  const { values, apiUrl, anonKey, serviceRole } = localSupabaseEnvironment();
  const originHost = host.includes(':') ? `[${host}]` : host;
  const appUrl = `http://${originHost}:${port}`;
  assertLoopbackUrl(appUrl, 'Acceptance app origin');
  const inherited = { ...process.env };
  delete inherited.FORCE_COLOR;
  delete inherited.NO_COLOR;
  return {
    ...inherited,
    SUPABASE_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.PUBLISHABLE_KEY ?? anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
    NEXT_PUBLIC_APP_URL: appUrl,
    PLAYWRIGHT_BASE_URL: appUrl,
    E2E_AUTH_SECRET: inherited.E2E_AUTH_SECRET?.trim() || 'release-local-browser-only',
    E2E_MERCHANT_ID: ACCEPTANCE_MERCHANT_ID,
    RELEASE_E2E_LOCAL: '1',
    INVESTIGATIONS_ENABLED: 'true',
    INVESTIGATION_EMAIL_DISPATCH_ENABLED: 'false',
    INVESTIGATION_MALWARE_SCAN_URL: `${apiUrl}/functions/v1/acceptance-malware-scan-disabled`,
    INVESTIGATION_MALWARE_SCAN_TOKEN: 'local-acceptance-disabled-token',
    GORGIAS_BOUNDED_WRITEBACK_ENABLED: 'false',
    VERCEL_ENV: 'development',
    PORT: String(port),
  };
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function fingerprint(value) {
  return sha256(stableJson(value));
}

export function fileSha256(filePath) {
  return sha256(readFileSync(filePath));
}

export function redactedEndpoint(value) {
  const url = new URL(value);
  return `${url.protocol}//${url.hostname}:${url.port || 'default'}`;
}
