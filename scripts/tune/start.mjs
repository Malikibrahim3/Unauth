#!/usr/bin/env node
/**
 * Start the full autonomous tuning run in the background, then attach the
 * terminal dashboard in the foreground.
 *
 * Usage:
 *   npm run tune:overnight
 *   npm run tune:overnight -- --skip-generate
 *   npm run tune:overnight -- --resume
 */

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const LOG_FILE = '/tmp/tune.log';

function isRunning() {
  try {
    return execSync('pgrep -f "scripts/tune/run.ts"', { encoding: 'utf8' }).trim().length > 0;
  } catch {
    return false;
  }
}

const userArgs = process.argv.slice(2);
const noDashboard = userArgs.includes('--no-dashboard');
const runArgs = userArgs.filter((arg) => arg !== '--no-dashboard');

if (!isRunning()) {
  fs.writeFileSync(LOG_FILE, '');
  const out = fs.openSync(LOG_FILE, 'a');
  const err = fs.openSync(LOG_FILE, 'a');

  const child = spawn(
    process.execPath,
    [
      '--max-old-space-size=8192',
      path.join(ROOT, 'node_modules/.bin/ts-node'),
      '--transpile-only',
      '--compiler-options',
      '{"module":"commonjs","moduleResolution":"node"}',
      path.join(ROOT, 'scripts/tune/run.ts'),
      ...runArgs,
    ],
    {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', out, err],
    },
  );
  child.unref();
  console.log(`Started identity tuning run in the background (pid ${child.pid}).`);
} else {
  console.log('Identity tuning run is already running; attaching dashboard.');
}

console.log(`Log: ${LOG_FILE}`);
console.log('Dashboard: Ctrl+C closes the dashboard only; the tuning run continues.');

if (!noDashboard) {
  const dash = spawn(process.execPath, [path.join(ROOT, 'scripts/tune/dashboard.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  dash.on('exit', (code) => process.exit(code ?? 0));
}
