import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ACCEPTANCE_ROOT,
  acceptanceRuntimeEnvironment,
  assertLoopbackUrl,
  fileSha256,
  fingerprint,
  redactedEndpoint,
  runtimeSourceFingerprint,
} from './acceptance/local-runtime.mjs';

const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://127.0.0.1:3016';
const parsedOrigin = assertLoopbackUrl(appOrigin, 'Acceptance build app origin');
const port = parsedOrigin.port || '3016';
const originHost = parsedOrigin.hostname.replace(/^\[(.*)\]$/, '$1');
const env = acceptanceRuntimeEnvironment({ host: originHost, port });
const artifactDir = path.join(process.cwd(), ACCEPTANCE_ROOT);
const receiptPath = path.join(artifactDir, 'build-environment.json');
fs.mkdirSync(artifactDir, { recursive: true });

function command(command, args) {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: 'utf8', shell: false, env });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}
function git(args) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: args.includes('-z') ? 'buffer' : 'utf8', shell: false });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed`);
  return result.stdout;
}

const commit = String(git(['rev-parse', 'HEAD'])).trim();
const branch = String(git(['branch', '--show-current'])).trim();
const dirtyBytes = git(['status', '--porcelain=v1', '-z']);
const manifests = ['lib/surfaces/manifest.ts', 'lib/navigation/appRoutes.ts', 'lib/navigation/aliases.js', 'next.config.js'];
const hashes = Object.fromEntries(manifests.map((file) => [file, fileSha256(path.join(process.cwd(), file))]));
const nextVersion = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'node_modules/next/package.json'), 'utf8')).version;
const startedAt = new Date().toISOString();
const sourceFingerprint = runtimeSourceFingerprint();
const build = command('npm', ['run', 'build']);
process.stdout.write(build.stdout);
process.stderr.write(build.stderr);
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
const sourceStable = runtimeSourceFingerprint() === sourceFingerprint;
const receipt = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  startedAt,
  status: build.status === 0 && sourceStable ? 'passed' : 'failed',
  runtimeSourceFingerprint: sourceFingerprint,
  sourceStable,
  commit,
  branch,
  dirtyTreeFingerprint: fingerprint(Buffer.from(dirtyBytes).toString('base64')),
  buildId: fs.existsSync(buildIdPath) ? fs.readFileSync(buildIdPath, 'utf8').trim() : null,
  manifestHashes: hashes,
  nodeVersion: process.version,
  nextVersion,
  appOrigin: redactedEndpoint(env.NEXT_PUBLIC_APP_URL),
  supabaseEndpoint: redactedEndpoint(env.NEXT_PUBLIC_SUPABASE_URL),
  injectedVariables: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_APP_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'E2E_AUTH_SECRET',
    'E2E_MERCHANT_ID',
    'RELEASE_E2E_LOCAL',
    'VERCEL_ENV',
  ],
  secretsPersisted: false,
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
if (build.status !== 0) process.exit(build.status);
if (!sourceStable) throw new Error('Runtime source changed during the build; this build cannot certify the current worktree.');
console.log(`Acceptance build receipt written: ${receiptPath}`);
