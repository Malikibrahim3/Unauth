#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import nextEnv from '@next/env';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const MERCHANT_ID = '4f5a8c25-6dcb-4b90-9e16-3a91c27d8f44';
const OWNER_EMAIL = 'demo@asterlane-demo.test';
const DEFAULT_OWNER_PASSWORD = 'AsterlaneDemo2026!';
const FIXTURE_TAG = 'landing-hero-evidence-hold';
const VIEWPORT = Object.freeze({ width: 1710, height: 960 });
const DEVICE_SCALE_FACTOR = 2;
const EXPECTED_RASTER = Object.freeze({ width: 3420, height: 1920 });
const DEFAULT_OUTPUT = 'public/product-proof/hero-case-gate-hold-signal-3420x1920.png';
const DEFAULT_RECEIPT = 'artifacts/landing-hero-proof/capture-receipt.json';
const VISIBLE_ASSERTIONS = Object.freeze([
  'CASE-1ECF9',
  '£128.00',
  '4 of 5',
  'Ask carrier for clarification',
  'Advisory only',
  'Merchant decision',
]);

function parseArgs(argv) {
  const values = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    values.set(key, next && !next.startsWith('--') ? argv[++index] : true);
  }
  return values;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function loopbackUrl(value) {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) {
    throw new Error(`Capture base URL must be loopback; refused ${hostname}`);
  }
  return url.toString().replace(/\/$/, '');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function resolveFeaturedCase(client) {
  const { data, error } = await client
    .from('support_payout_cases')
    .select('id')
    .eq('merchant_id', MERCHANT_ID)
    .contains('detection_detail', { fixture_tag: FIXTURE_TAG });
  if (error) throw new Error(`Featured case lookup failed: ${error.message}`);
  if ((data ?? []).length !== 1) throw new Error(`Expected exactly one ${FIXTURE_TAG} case, found ${(data ?? []).length}`);
  return data[0].id;
}

async function waitForServer(baseURL, runtime) {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if (runtime?.child.exitCode != null || runtime?.child.signalCode != null) {
      throw new Error(`Owned Next server exited before capture. ${runtime.log().slice(-2000)}`);
    }
    const response = await fetch(`${baseURL}/legal/privacy`, { redirect: 'manual' }).catch(() => null);
    if (response && response.status < 500) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timed out waiting for the local app.');
}

async function startServer(baseURL, e2eSecret) {
  const url = new URL(baseURL);
  const chunks = [];
  const child = spawn(process.execPath, [
    require.resolve('next/dist/bin/next'),
    'dev',
    '--webpack',
    '--hostname',
    url.hostname,
    '--port',
    url.port || '3000',
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      E2E_AUTH_SECRET: e2eSecret,
      E2E_ALLOWED_MERCHANT_IDS: MERCHANT_ID,
      PLAYWRIGHT_BASE_URL: baseURL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const collect = (chunk) => {
    chunks.push(String(chunk));
    while (chunks.join('').length > 24_000) chunks.shift();
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const runtime = { child, log: () => chunks.join('') };
  await waitForServer(baseURL, runtime);
  return runtime;
}

async function stopServer(runtime) {
  if (!runtime || runtime.child.exitCode != null || runtime.child.signalCode != null) return;
  runtime.child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => runtime.child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (runtime.child.exitCode == null && runtime.child.signalCode == null) runtime.child.kill('SIGKILL');
}

async function authenticate(page, baseURL, secret, route, password) {
  const authUrl = new URL('/api/test/e2e-auth', baseURL);
  authUrl.searchParams.set('secret', secret);
  authUrl.searchParams.set('merchant_id', MERCHANT_ID);
  authUrl.searchParams.set('redirect', route);
  await page.goto(authUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const current = new URL(page.url());
  if (current.pathname === route) return;

  const loginUrl = new URL('/login', baseURL);
  loginUrl.searchParams.set('next', route);
  await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => {
    const form = document.querySelector('form');
    return Boolean(form && Object.keys(form).some((key) => key.startsWith('__reactProps')));
  }, undefined, { timeout: 120_000 });
  await page.locator('#login-email').fill(OWNER_EMAIL);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  try {
    await page.waitForURL((url) => url.pathname === route, { timeout: 120_000 });
  } catch {
    throw new Error('Existing Asterlane demo credentials did not reach the featured case route.');
  }
}

async function assertWorkbench(page) {
  await page.locator('[data-surface-id="case-review-workbench"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.locator('[data-state-id="case-detail-challenge-6"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: 120_000 });
  for (const text of VISIBLE_ASSERTIONS) {
    try {
      await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 60_000 });
    } catch {
      const facts = await page.locator('[aria-label="Case facts"]').innerText().catch(() => 'Case facts unavailable');
      throw new Error(`Featured workbench is missing the expected text "${text}". Case facts: ${facts.replace(/\s+/g, ' ').trim()}`);
    }
  }
  const surface = page.locator('[data-state-id="case-detail-challenge-6"]');
  const surfaceText = await surface.innerText();
  for (const forbidden of ['Loading', 'Overdue', 'Recorded decision']) {
    if (surfaceText.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`Featured workbench unexpectedly contains ${forbidden}`);
    }
  }
  const recommendation = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Recommendation', exact: true }) }).first();
  const recommendationText = await recommendation.innerText();
  if (/approve\s+(payout|refund)/i.test(recommendationText)) {
    throw new Error('Featured recommendation unexpectedly approves payout.');
  }
  const finalUrl = new URL(page.url());
  if (finalUrl.pathname === '/login') throw new Error('Featured workbench resolved to sign-in.');
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
  if (overflow > 1) throw new Error(`Featured workbench has ${overflow}px horizontal overflow.`);
}

const args = parseArgs(process.argv);
const baseURL = loopbackUrl(String(args.get('base-url') ?? 'http://127.0.0.1:3014'));
const output = path.resolve(String(args.get('output') ?? DEFAULT_OUTPUT));
const receiptPath = path.resolve(String(args.get('receipt') ?? DEFAULT_RECEIPT));
const e2eSecret = required('E2E_AUTH_SECRET');
const ownerPassword = process.env.SEED_OWNER_PASSWORD?.trim() || DEFAULT_OWNER_PASSWORD;
const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
const serviceRole = required('SUPABASE_SERVICE_ROLE_KEY');
const client = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
const caseId = await resolveFeaturedCase(client);
const route = `/cases/${caseId}`;
let runtime = null;
let browser = null;

try {
  if (args.has('start-server')) runtime = await startServer(baseURL, e2eSecret);
  else await waitForServer(baseURL, null);

  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });
  const page = await context.newPage();
  await authenticate(page, baseURL, e2eSecret, route, ownerPassword);
  await assertWorkbench(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output, type: 'png', fullPage: false, animations: 'disabled', caret: 'hide' });
  const bytes = fs.readFileSync(output);
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== EXPECTED_RASTER.width || metadata.height !== EXPECTED_RASTER.height) {
    throw new Error(`Capture is ${metadata.width}x${metadata.height}; expected ${EXPECTED_RASTER.width}x${EXPECTED_RASTER.height}`);
  }
  const receipt = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    route,
    fixtureTag: FIXTURE_TAG,
    colorMode: 'light',
    viewport: { ...VIEWPORT, deviceScaleFactor: DEVICE_SCALE_FACTOR },
    dimensions: EXPECTED_RASTER,
    visibleTextAssertions: VISIBLE_ASSERTIONS,
    absentStateAssertions: ['loading', 'overdue SLA', 'recorded merchant decision', 'approve-payout recommendation'],
    asset: path.relative(process.cwd(), output),
    sha256: sha256(bytes),
  };
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o644 });
  process.stdout.write(`Captured ${receipt.asset} (${metadata.width}x${metadata.height})\nReceipt: ${path.relative(process.cwd(), receiptPath)}\nSHA-256: ${receipt.sha256}\n`);
  await context.close();
} finally {
  await browser?.close();
  await stopServer(runtime);
}
