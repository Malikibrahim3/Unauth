import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { acceptanceRuntimeEnvironment } from './acceptance/local-runtime.mjs';

const host = '::1';
const port = process.env.RELEASE_ROLE_PORT?.trim() || '3019';
const aliasOnly = process.argv.includes('--alias-only');
const password = process.env.RELEASE_ROLE_PASSWORD?.trim() || randomBytes(32).toString('base64url');
const env = { ...acceptanceRuntimeEnvironment({ host, port }), RELEASE_ROLE_PASSWORD: password, ROLE_ACCEPTANCE_BASE_URL: `http://[::1]:${port}` };

function run(script) {
  const result = spawnSync('npm', ['run', script], { cwd: process.cwd(), stdio: 'inherit', shell: false, env });
  if (result.status !== 0) throw new Error(`${script} failed`);
}
async function waitUntilReady() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${env.ROLE_ACCEPTANCE_BASE_URL}/login`, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Role acceptance server did not become ready within 120 seconds');
}

let server;
let prepared = false;
try {
  // The browser bundle in .next bakes NEXT_PUBLIC_* values at build time.
  // Build inside the same guarded loopback environment before starting the
  // server; otherwise a prior non-local build can make every login call the
  // wrong Supabase endpoint and turn the role pass into misleading 400s.
  run('build:acceptance');
  run('prepare:role-acceptance');
  prepared = true;
  server = spawn('npm', ['run', 'start:acceptance', '--', '--host', host, '--port', port], { cwd: process.cwd(), stdio: 'inherit', shell: false, env });
  await waitUntilReady();
  if (!aliasOnly) run('test:role-acceptance');
  run('test:alias-acceptance');
} finally {
  if (server && !server.killed) server.kill('SIGTERM');
  if (prepared) run('cleanup:role-acceptance');
}
