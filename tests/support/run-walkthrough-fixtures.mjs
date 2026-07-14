#!/usr/bin/env node
/**
 * Run webhook fixtures for Gorgias walkthrough (after Playwright saves state.json).
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, 'walkthrough-artifacts/state.json');
const OUT_DIR = join(__dirname, 'walkthrough-artifacts');

function loadEnvLocal() {
  const envPath = join(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function runFixture(args, label) {
  const result = spawnSync('npm', ['run', 'post:gorgias-webhook-fixture', '--', ...args], {
    cwd: join(__dirname, '../..'),
    encoding: 'utf-8',
    env: process.env,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  writeFileSync(join(OUT_DIR, `${label}.txt`), output);
  let status = result.status ?? 1;
  let body = null;
  const jsonStart = output.indexOf('{');
  if (jsonStart >= 0) {
    try {
      body = JSON.parse(output.slice(jsonStart));
    } catch {
      body = null;
    }
  }
  return { status, output, body, httpStatus: body ? 200 : status };
}

loadEnvLocal();
mkdirSync(OUT_DIR, { recursive: true });

if (!existsSync(STATE_PATH)) {
  console.error('Missing state.json — run Playwright walkthrough first.');
  process.exit(1);
}

const state = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
const secret = state.rotatedSecret ?? state.webhookSecret;
if (!secret) {
  console.error('No webhook secret in state.json');
  process.exit(1);
}

const baseArgs = [
  '--account-id',
  'live-link-verify-ui',
  '--webhook-secret',
  secret,
  '--shop-domain',
  'merchant-a.myshopify.com',
  '--order-ref',
  '1007',
];

const valid = runFixture(baseArgs, 'fixture-valid');
const wrong = runFixture(
  [
    '--account-id',
    'live-link-verify-ui',
    '--webhook-secret',
    'wrong-secret-value-32chars-minimum',
    '--shop-domain',
    'merchant-a.myshopify.com',
    '--order-ref',
    '1007',
  ],
  'fixture-wrong'
);

const report = {
  valid: {
    exitCode: valid.status,
    body: valid.body,
    outputTail: valid.output.slice(-800),
  },
  wrong: {
    exitCode: wrong.status,
    body: wrong.body,
    outputTail: wrong.output.slice(-800),
  },
};

writeFileSync(join(OUT_DIR, 'fixture-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

process.exit(valid.status === 0 ? 0 : 1);
