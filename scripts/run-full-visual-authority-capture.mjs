#!/usr/bin/env node

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { acceptanceRuntimeEnvironment } from './acceptance/local-runtime.mjs';

const captureName = process.argv[2] ?? 'full-visual-authority-2026-09-02';
const skipBuild = process.argv.includes('--skip-build');
if (!/^full-visual-authority-[a-zA-Z0-9-]+$/.test(captureName)) {
  throw new Error('Capture name must use the full-visual-authority-* namespace.');
}
const root = path.join('artifacts', captureName);
const fixtureManifest = path.join(root, 'fixture-manifest.json');
const output = path.join(root, 'routes');
const env = {
  ...acceptanceRuntimeEnvironment({ port: '3013' }),
  E2E_AUTH_SECRET: crypto.randomBytes(32).toString('base64url'),
  UNAUTH_DISABLE_WEBPACK_CACHE: '1',
};

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    shell: false,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status ?? 'unknown'}`);
  }
}

run(process.execPath, ['scripts/prepare-distinctive-capture-fixtures.mjs', '--manifest', fixtureManifest]);
if (!skipBuild) run('npm', ['run', 'build']);
run(process.execPath, [
  'scripts/capture-distinctive-baseline.mjs',
  '--start-server',
  '--production',
  '--base-url',
  'http://127.0.0.1:3013',
  '--fixtures',
  fixtureManifest,
  '--output',
  output,
]);

console.log(`Full visual-authority capture complete: ${output}`);
