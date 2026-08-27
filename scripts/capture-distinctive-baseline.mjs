#!/usr/bin/env node

import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import nextEnv from '@next/env';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = nextEnv;
const FIXTURE_TAG = 'distinctive-capture-fixture-v1';
const EXPECTED_PAGE_MODULES = 64;
const EXPECTED_RENDERED_MODULES = 60;
const EXPECTED_ADAPTERS = 4;
const EXPECTED_SCREENSHOTS = 73;
const NAVIGATION_ATTEMPTS = 2;
const NAVIGATION_TIMEOUT_MS = 180_000;
const READINESS_TIMEOUT_MS = 120_000;
const PUBLIC_VIEWPORTS = Object.freeze([
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'narrow', width: 390, height: 844 },
]);
const APP_VIEWPORT = Object.freeze({ name: 'desktop', width: 1280, height: 720 });
const NARROW_GATE_VIEWPORT = Object.freeze({ name: 'narrow-gate', width: 390, height: 844 });
const DEFAULT_OUTPUT = 'artifacts/unauth-ui/distinctive-craft-2026-08-13/baseline';
const DEFAULT_FIXTURES = 'artifacts/unauth-ui/distinctive-craft-2026-08-13/fixture-manifest.json';
const SOURCE_ROOTS = ['app', 'components', 'lib', 'styles', 'public', 'package.json', 'package-lock.json', 'next.config.js', 'tsconfig.json'];

function parseArgs(argv) {
  const parsed = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    parsed.set(key, next && !next.startsWith('--') ? argv[++index] : true);
  }
  return parsed;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function assertLoopbackUrl(value, label) {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) {
    throw new Error(`${label} must use a loopback host; refused ${hostname}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${label} must use HTTP(S)`);
  return url.toString().replace(/\/$/, '');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function redactFailure(error, secrets) {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) {
    if (secret) message = message.replaceAll(secret, '[REDACTED_SECRET]');
  }
  return message
    .replace(/^\s*-?\s*cookie:\s*.*$/gim, '    - cookie: [REDACTED_SECRET]')
    .replace(/(sb-[a-z0-9.-]+-auth-token=)[^;\s]+/gi, '$1[REDACTED_SECRET]')
    .replace(/\bbase64-[A-Za-z0-9+/_=-]{24,}\b/g, '[REDACTED_SECRET]')
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_SECRET]')
    .replace(/([?&]secret=)[^&\s]+/gi, '$1[REDACTED_SECRET]');
}

function slug(value) {
  return value.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function loadSurfaceAuthority() {
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node' });
  require('ts-node/register/transpile-only');
  const authority = require('../lib/surfaces/manifest.ts');
  const entries = [...authority.surfaceManifest];
  const rendered = entries.filter((entry) => entry.maturity !== 'adapter');
  const adapters = entries.filter((entry) => entry.maturity === 'adapter');
  const expectedScreenshots = rendered.filter(publicResponsiveOwner).length * 2
    + rendered.filter((entry) => !publicResponsiveOwner(entry)).length
    + 1;
  if (entries.length !== EXPECTED_PAGE_MODULES || rendered.length !== EXPECTED_RENDERED_MODULES || adapters.length !== EXPECTED_ADAPTERS) {
    throw new Error(`Surface authority drift: expected ${EXPECTED_PAGE_MODULES}/${EXPECTED_RENDERED_MODULES}/${EXPECTED_ADAPTERS}, received ${entries.length}/${rendered.length}/${adapters.length}`);
  }
  if (expectedScreenshots !== EXPECTED_SCREENSHOTS) {
    throw new Error(`Capture viewport drift: expected ${EXPECTED_SCREENSHOTS} screenshots, received ${expectedScreenshots}`);
  }
  return { entries, rendered, adapters, expectedScreenshots };
}

function publicResponsiveOwner(entry) {
  return ['PublicShell', 'AuthShell', 'OnboardingShell'].includes(entry.shell);
}

function walkFiles(root) {
  const absolute = path.resolve(root);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  const files = [];
  const visit = (directory) => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.name === 'node_modules' || item.name === '.next' || item.name === '.git' || item.name === 'artifacts') continue;
      const file = path.join(directory, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile()) files.push(file);
    }
  };
  visit(absolute);
  return files;
}

function sourceFingerprint() {
  const files = SOURCE_ROOTS.flatMap(walkFiles).sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    const relative = path.relative(process.cwd(), file);
    hash.update(relative);
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), fileCount: files.length, roots: SOURCE_ROOTS };
}

function gitFingerprint() {
  const run = (...args) => execFileSync('git', args, { cwd: process.cwd(), encoding: null, maxBuffer: 128 * 1024 * 1024 });
  const head = run('rev-parse', 'HEAD').toString('utf8').trim();
  const branch = run('branch', '--show-current').toString('utf8').trim();
  const status = run('status', '--porcelain=v1', '-z');
  return { head, branch, statusSha256: sha256(status), dirty: status.length > 0 };
}

function readFixtureManifest(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing fixture manifest ${file}; run prepare:distinctive-capture-fixtures first`);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.fixtureTag !== FIXTURE_TAG || manifest.localOnly !== true) {
    throw new Error(`Fixture manifest ${file} is not a ${FIXTURE_TAG} local fixture`);
  }
  return manifest;
}

async function selectId(client, merchantId, table, configure = (query) => query) {
  let query = client.from(table).select('id').eq('merchant_id', merchantId);
  query = configure(query);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw new Error(`${table} fixture lookup failed: ${error.message}`);
  return data?.id ?? null;
}

async function resolveRenderedRoutes(client, merchantId, fixtures, rendered) {
  const ids = {
    caseId: await selectId(client, merchantId, 'support_payout_cases', (query) => query.order('created_at', { ascending: true })),
    customerId: await selectId(client, merchantId, 'merchant_customers', (query) => query.order('created_at', { ascending: true })),
    shipmentId: await selectId(client, merchantId, 'source_shipments', (query) => query.order('created_at', { ascending: true })),
    lossId: await selectId(client, merchantId, 'loss_cases', (query) => query.order('created_at', { ascending: true })),
    recoveryId: await selectId(client, merchantId, 'recovery_cases', (query) => query.order('created_at', { ascending: true })),
    ruleId: await selectId(client, merchantId, 'merchant_rules', (query) => query.order('created_at', { ascending: true })),
    importJobId: await selectId(client, merchantId, 'sync_jobs', (query) => query.eq('job_kind', 'csv_import').order('created_at', { ascending: true })),
  };
  const missing = Object.entries(ids).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing local baseline fixtures: ${missing.join(', ')}`);
  const dynamic = new Map([
    ['/cases/[caseId]', `/cases/${ids.caseId}`],
    ['/customers/[id]', `/customers/${ids.customerId}`],
    ['/customers/[id]/evidence/new', `/customers/${ids.customerId}/evidence/new`],
    ['/orders/[id]', fixtures.routes.order],
    ['/refunds/[id]', fixtures.routes.refund],
    ['/returns/[id]', fixtures.routes.return],
    ['/shipments/[id]', `/shipments/${ids.shipmentId}`],
    ['/tickets/[id]', fixtures.routes.ticket],
    ['/disputes/[id]', fixtures.routes.dispute],
    ['/financials/losses/[lossId]', `/financials/losses/${ids.lossId}`],
    ['/financials/recovery/[recoveryId]', `/financials/recovery/${ids.recoveryId}`],
    ['/controls/rules/[ruleId]', `/controls/rules/${ids.ruleId}`],
    ['/controls/flows/[flowId]', fixtures.routes.flow],
    ['/controls/flows/runs/[runId]', fixtures.routes.flowRun],
    ['/sources/[sourceId]', '/sources/shopify'],
    ['/sources/setup/[providerId]', '/sources/setup/shopify'],
    ['/help/[articleSlug]', '/help/case-investigation'],
    ['/financials/reports/[reportId]', '/financials/reports/financial'],
    ['/sources/imports/[jobId]', `/sources/imports/${ids.importJobId}`],
  ]);
  const routes = rendered.map((entry) => ({
    entry,
    route: entry.pathPattern.includes('[') ? dynamic.get(entry.pathPattern) : entry.pathPattern,
  }));
  const unresolved = routes.filter((item) => !item.route).map((item) => item.entry.pathPattern);
  if (unresolved.length) throw new Error(`Unresolved rendered module paths: ${unresolved.join(', ')}`);
  return { routes, ids };
}

async function validateDistinctiveFixtures(client, merchantId, fixtures) {
  const checks = [
    ['source_orders', fixtures.records.order],
    ['source_refunds', fixtures.records.refund],
    ['source_returns', fixtures.records.return],
    ['source_tickets', fixtures.records.ticket],
    ['source_disputes', fixtures.records.dispute],
    ['workflow_definitions', fixtures.records.workflowDefinition],
    ['workflow_runs', fixtures.records.workflowRun],
  ];
  for (const [table, id] of checks) {
    const { data, error } = await client.from(table).select('id,merchant_id').eq('id', id).eq('merchant_id', merchantId).maybeSingle();
    if (error) throw new Error(`${table} capture-fixture verification failed: ${error.message}`);
    if (!data) throw new Error(`Missing ${FIXTURE_TAG} row ${table}:${id}`);
  }
}

async function waitForServer(baseURL, child, logTail) {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Owned Next.js server exited early (${child.exitCode ?? child.signalCode}). ${logTail().slice(-3000)}`);
    }
    try {
      const response = await fetch(`${baseURL}/legal/privacy`, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Owned Next.js server did not become ready. ${logTail().slice(-3000)}`);
}

async function startOwnedServer(baseURL, merchantIds, production = false) {
  try {
    const response = await fetch(`${baseURL}/legal/privacy`, { redirect: 'manual' });
    if (response) throw new Error(`${baseURL} is already in use; refusing to capture an unowned runtime`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already in use')) throw error;
  }
  const url = new URL(baseURL);
  const nextBin = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [
    nextBin,
    production ? 'start' : 'dev',
    ...(production ? [] : ['--webpack']),
    '--hostname',
    url.hostname,
    '--port',
    url.port || '3000',
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      E2E_ALLOWED_MERCHANT_IDS: merchantIds.join(','),
      PLAYWRIGHT_BASE_URL: baseURL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks = [];
  const collect = (chunk) => {
    chunks.push(String(chunk));
    while (chunks.join('').length > 24_000) chunks.shift();
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const logTail = () => chunks.join('');
  const runtime = { child, logTail };
  try {
    await waitForServer(baseURL, child, logTail);
    return runtime;
  } catch (error) {
    await stopOwnedServer(runtime);
    throw error;
  }
}

async function stopOwnedServer(runtime) {
  if (!runtime || runtime.child.exitCode !== null || runtime.child.signalCode !== null) return;
  runtime.child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => runtime.child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (runtime.child.exitCode === null && runtime.child.signalCode === null) {
    runtime.child.kill('SIGKILL');
    await Promise.race([
      new Promise((resolve) => runtime.child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
}

async function createAuthState(browser, baseURL, secret, merchantId, destination, statePath) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    const authUrl = new URL('/api/test/e2e-auth', baseURL);
    authUrl.searchParams.set('secret', secret);
    authUrl.searchParams.set('merchant_id', merchantId);
    authUrl.searchParams.set('redirect', destination);
    const response = await page.goto(authUrl.toString(), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    const current = new URL(page.url());
    const expected = new URL(destination, baseURL);
    if (current.pathname !== expected.pathname || current.search !== expected.search) {
      const detail = (await page.textContent('body').catch(() => ''))?.trim().slice(0, 180);
      throw new Error(`Local E2E auth failed for ${merchantId}: HTTP ${response?.status() ?? 'unknown'}${detail ? ` (${detail})` : ''}`);
    }
    await context.storageState({ path: statePath });
  } finally {
    await context.close();
  }
}

async function waitForRoute(page, authenticated, onboarding) {
  if (authenticated && !onboarding) {
    await page.locator('[data-shell-ready="true"][data-auth-resolved="true"]').first().waitFor({ state: 'visible', timeout: READINESS_TIMEOUT_MS });
    await page.locator('[data-data-resolved="true"]').first().waitFor({ state: 'attached', timeout: READINESS_TIMEOUT_MS });
    const routeState = await page.locator('[data-route-state]').first().getAttribute('data-route-state');
    if (!routeState || routeState === 'loading' || routeState === 'timeout') throw new Error(`Route did not reach a terminal state (${routeState ?? 'missing'})`);
    return routeState;
  } else if (onboarding) {
    await page.locator('[data-surface-id="workspace-onboarding"]').first().waitFor({ state: 'visible', timeout: READINESS_TIMEOUT_MS });
  } else {
    // A public route's segment loading shell also contains <main> and a
    // data-surface-id. Waiting for either can therefore record a skeleton as
    // final evidence while the real page is still streaming. Every governed
    // public/auth/legal owner has a visible task/document heading; require it
    // and require all busy descendants to clear before accepting the frame.
    await page.locator('h1:visible').first().waitFor({ state: 'visible', timeout: READINESS_TIMEOUT_MS });
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: READINESS_TIMEOUT_MS });
  }
  return 'loaded';
}

async function waitForCaptureStability(page) {
  await page.waitForFunction(() => {
    const visibleImages = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    });
    return visibleImages.every((image) => image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

  let previous = null;
  let stableSamples = 0;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const snapshot = await page.evaluate(() => JSON.stringify({
      document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      body: [document.body?.scrollWidth ?? 0, document.body?.scrollHeight ?? 0],
      busy: document.querySelectorAll('[aria-busy="true"]').length,
      regions: Array.from(document.querySelectorAll('[data-surface-id], .ua-chart-frame, img'))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
        })
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)];
        }),
    }));
    if (snapshot === previous) stableSamples += 1;
    else stableSamples = 0;
    if (stableSamples >= 2) return;
    previous = snapshot;
    await page.waitForTimeout(100);
  }
  throw new Error('Visible route geometry did not settle before capture');
}

async function normalizeCaptureViewport(page, authenticated) {
  await page.evaluate((isAuthenticated) => {
    window.scrollTo(0, 0);
    document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
    if (isAuthenticated) {
      const scroller = document.querySelector('#app-scroll-container');
      if (scroller instanceof HTMLElement) {
        scroller.scrollTo(0, 0);
        scroller.scrollLeft = 0;
      }
    }
  }, authenticated);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const shell = await page.evaluate((isAuthenticated) => {
    if (!isAuthenticated) return null;
    const main = document.querySelector('#app-scroll-container');
    const root = main?.querySelector('[data-surface-id]');
    // Some detail routes put a readiness/surface boundary outside the
    // PageFrame that owns the visible H1. Validate the first visible page
    // heading in the authenticated main region rather than assuming it is a
    // descendant of the first surface marker.
    const heading = Array.from(main?.querySelectorAll('h1') ?? []).find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = getComputedStyle(candidate);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    const mainRect = main?.getBoundingClientRect();
    const rootRect = root?.getBoundingClientRect();
    const headingRect = heading?.getBoundingClientRect();
    return {
      mainScrollLeft: main instanceof HTMLElement ? main.scrollLeft : null,
      mainLeft: mainRect?.left ?? null,
      rootLeft: rootRect?.left ?? null,
      headingLeft: headingRect?.left ?? null,
      headingRight: headingRect?.right ?? null,
    };
  }, authenticated);
  if (shell && (
    shell.mainScrollLeft !== 0
    || shell.mainLeft == null
    || shell.rootLeft == null
    || shell.headingLeft == null
    || shell.headingRight == null
    || shell.rootLeft < shell.mainLeft - 1
    || shell.headingLeft < shell.mainLeft - 1
    || shell.headingRight > page.viewportSize().width + 1
  )) {
    throw new Error(`Authenticated shell is offset or clips its primary heading: ${JSON.stringify(shell)}`);
  }
}

async function warmRouteForRetry(context, url) {
  const response = await context.request.get(url.toString(), {
    failOnStatusCode: false,
    timeout: NAVIGATION_TIMEOUT_MS,
  });
  try {
    if (response.status() >= 500) throw new Error(`retry warmup returned HTTP ${response.status()}`);
    await response.body();
  } finally {
    await response.dispose();
  }
}

function attachPageDiagnostics(page, attempt, consoleErrors, pageErrors, serverErrors) {
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ attempt, message: message.text().slice(0, 500) });
  });
  page.on('pageerror', (error) => pageErrors.push({ attempt, message: error.message.slice(0, 500) }));
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push({ attempt, status: response.status(), url: response.url().replace(/\?.*$/, '') });
  });
}

async function openReadyPage({ context, requested, authenticated, onboarding, consoleErrors, pageErrors, serverErrors }) {
  const failures = [];
  for (let attempt = 1; attempt <= NAVIGATION_ATTEMPTS; attempt += 1) {
    const page = await context.newPage();
    attachPageDiagnostics(page, attempt, consoleErrors, pageErrors, serverErrors);
    try {
      const response = await page.goto(requested.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      if (response && response.status() >= 500) throw new Error(`navigation returned HTTP ${response.status()}`);
      const routeState = await waitForRoute(page, authenticated, onboarding);
      await waitForCaptureStability(page);
      await normalizeCaptureViewport(page, authenticated && !onboarding);
      return { page, response, routeState, failures };
    } catch (error) {
      failures.push({
        attempt,
        url: page.url(),
        error: (error instanceof Error ? error.message : String(error)).slice(0, 1200),
      });
      await page.close();
      if (attempt === NAVIGATION_ATTEMPTS) {
        throw new Error(`${requested.pathname} did not become capture-ready after ${NAVIGATION_ATTEMPTS} attempts: ${failures.map((failure) => `attempt ${failure.attempt}: ${failure.error}`).join(' | ')}`);
      }
      await warmRouteForRetry(context, requested).catch((warmError) => {
        failures.push({
          attempt: `${attempt}-warmup`,
          url: requested.toString(),
          error: (warmError instanceof Error ? warmError.message : String(warmError)).slice(0, 1200),
        });
      });
    }
  }
  throw new Error(`${requested.pathname} did not create a capture page`);
}

async function openNarrowBoundaryPage(context, requested) {
  const failures = [];
  for (let attempt = 1; attempt <= NAVIGATION_ATTEMPTS; attempt += 1) {
    const page = await context.newPage();
    try {
      const response = await page.goto(requested.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      if (response && response.status() >= 400) throw new Error(`navigation returned HTTP ${response.status()}`);
      await page.getByRole('heading', { name: 'Unauth requires a desktop', exact: true }).waitFor({
        state: 'visible',
        timeout: READINESS_TIMEOUT_MS,
      });
      await waitForCaptureStability(page);
      return { page, failures };
    } catch (error) {
      failures.push({
        attempt,
        url: page.url(),
        error: (error instanceof Error ? error.message : String(error)).slice(0, 1200),
      });
      await page.close();
      if (attempt === NAVIGATION_ATTEMPTS) {
        throw new Error(`${requested.pathname} narrow boundary did not become capture-ready after ${NAVIGATION_ATTEMPTS} attempts: ${failures.map((failure) => `attempt ${failure.attempt}: ${failure.error}`).join(' | ')}`);
      }
      await warmRouteForRetry(context, requested).catch((warmError) => {
        failures.push({
          attempt: `${attempt}-warmup`,
          url: requested.toString(),
          error: (warmError instanceof Error ? warmError.message : String(warmError)).slice(0, 1200),
        });
      });
    }
  }
  throw new Error(`${requested.pathname} did not create a narrow boundary page`);
}

async function inspectPng(file, viewport, label) {
  const bytes = fs.readFileSync(file);
  const signature = bytes.subarray(0, 8).toString('hex');
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'png' || signature !== '89504e470d0a1a0a') throw new Error(`${label} is not a genuine PNG`);
  if (metadata.width !== viewport.width || metadata.height !== viewport.height) {
    throw new Error(`${label} is ${metadata.width}x${metadata.height}; expected ${viewport.width}x${viewport.height}`);
  }
  const pixels = await sharp(bytes).ensureAlpha().raw().toBuffer();
  const pixelHeader = Buffer.from(`${metadata.width}x${metadata.height}:rgba\0`);
  return {
    bytes,
    sha256: sha256(bytes),
    pixelSha256: sha256(Buffer.concat([pixelHeader, pixels])),
    signature,
    raster: { width: metadata.width, height: metadata.height, channels: metadata.channels, depth: metadata.depth },
  };
}

async function captureRoute({ context, baseURL, route, entry, viewport, stagingDir, sequence, authenticated, onboarding = false }) {
  const consoleErrors = [];
  const pageErrors = [];
  const serverErrors = [];
  const requested = new URL(route, baseURL);
  const ready = await openReadyPage({
    context,
    requested,
    authenticated,
    onboarding,
    consoleErrors,
    pageErrors,
    serverErrors,
  });
  const { page, response, routeState } = ready;
  try {
    const final = new URL(page.url());
    if (final.pathname !== requested.pathname) throw new Error(`${route} resolved to ${final.pathname}`);
    if (authenticated && final.pathname === '/login') throw new Error(`${route} resolved to sign-in`);
    if (response && response.status() >= 400) throw new Error(`${route} returned HTTP ${response.status()}`);
    if (['error', 'forbidden', 'not-found'].includes(routeState)) {
      throw new Error(`${route} reached ${routeState}; baseline evidence requires a usable route state`);
    }
    const details = await page.evaluate(() => ({
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1,h2,h3'))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((node) => node.textContent?.trim()).filter(Boolean),
      surfaceIds: Array.from(document.querySelectorAll('[data-surface-id]'))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((node) => node.getAttribute('data-surface-id')).filter(Boolean),
      routeState: document.querySelector('[data-route-state]')?.getAttribute('data-route-state') ?? document.querySelector('[data-state-id]')?.getAttribute('data-state-id') ?? 'loaded',
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    }));
    if (details.overflowX > 1) throw new Error(`${route} has ${details.overflowX}px page-level horizontal overflow at ${viewport.width}px`);
    const filename = `${String(sequence).padStart(3, '0')}-${slug(entry.id)}-${viewport.name}.png`;
    const absoluteFile = path.join(stagingDir, filename);
    await page.screenshot({ path: absoluteFile, type: 'png', fullPage: false, animations: 'disabled', caret: 'hide' });
    const inspected = await inspectPng(absoluteFile, viewport, filename);
    return {
      stableSurfaceId: entry.id,
      pathPattern: entry.pathPattern,
      pageModule: entry.pageModule,
      shell: entry.shell,
      requestedUrl: requested.toString(),
      finalUrl: final.toString(),
      viewport,
      artifact: filename,
      sha256: inspected.sha256,
      pixelSha256: inspected.pixelSha256,
      bytes: inspected.bytes.length,
      pngSignature: inspected.signature,
      raster: inspected.raster,
      ...details,
      diagnostics: { consoleErrors, pageErrors, serverErrors, readinessFailures: ready.failures },
    };
  } finally {
    await page.close();
  }
}

function searchObject(url) {
  return Object.fromEntries([...new URL(url).searchParams.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

async function verifyAdapter(context, baseURL, descriptor) {
  const requested = new URL(descriptor.requested, baseURL);
  const consoleErrors = [];
  const pageErrors = [];
  const serverErrors = [];
  const ready = await openReadyPage({
    context,
    requested,
    authenticated: true,
    onboarding: false,
    consoleErrors,
    pageErrors,
    serverErrors,
  });
  const { page, response, routeState } = ready;
  try {
    const final = new URL(page.url());
    if (response && response.status() >= 400) throw new Error(`${requested.pathname} returned HTTP ${response.status()}`);
    if (['error', 'forbidden', 'not-found'].includes(routeState)) throw new Error(`${requested.pathname} adapter reached ${routeState}`);
    if (final.pathname !== descriptor.expectedPath) throw new Error(`${requested.pathname} resolved to ${final.pathname}, expected ${descriptor.expectedPath}`);
    const actualQuery = searchObject(final.toString());
    for (const [key, value] of Object.entries(descriptor.expectedQuery)) {
      if (actualQuery[key] !== value) throw new Error(`${requested.pathname} lost ${key}=${value}`);
    }
    return {
      stableSurfaceId: descriptor.id,
      requestedUrl: requested.toString(),
      finalUrl: final.toString(),
      expectedPath: descriptor.expectedPath,
      expectedQuery: descriptor.expectedQuery,
      verdict: 'passed',
      diagnostics: { consoleErrors, pageErrors, serverErrors, readinessFailures: ready.failures },
    };
  } finally {
    await page.close();
  }
}

function writeGallery(stagingDir, captures) {
  const cards = captures.map((record) => `<article><img loading="lazy" src="${escapeHtml(record.artifact)}" alt="${escapeHtml(record.stableSurfaceId)} ${escapeHtml(record.viewport.name)}"><h2>${escapeHtml(record.stableSurfaceId)}</h2><p>${escapeHtml(record.finalUrl)} · ${record.viewport.width}×${record.viewport.height}</p></article>`).join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Distinctive craft baseline</title><style>body{margin:0;padding:24px;background:#f2f1ed;color:#1e211c;font:14px/1.45 system-ui,sans-serif}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}article{background:white;border:1px solid #d8d8d1;padding:12px}img{display:block;width:100%;height:auto;border:1px solid #e7e7e2}h2{font-size:14px;margin:10px 0 2px}p{color:#62665d;margin:0;overflow-wrap:anywhere}</style></head><body><main>${cards}</main></body></html>`;
  fs.writeFileSync(path.join(stagingDir, 'gallery.html'), html);
}

function writeEvidenceFiles(stagingDir, payload) {
  const artifactRecords = [...payload.captures, payload.narrowBoundary]
    .map((capture) => `${capture.sha256}  ${capture.artifact}`)
    .sort();
  fs.writeFileSync(path.join(stagingDir, 'SHA256SUMS'), `${artifactRecords.join('\n')}\n`);
  fs.writeFileSync(path.join(stagingDir, 'screenshot-manifest.json'), `${JSON.stringify(payload.manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(stagingDir, 'route-capture-records.json'), `${JSON.stringify({ routes: payload.captures, narrowBoundary: payload.narrowBoundary, adapters: payload.adapters }, null, 2)}\n`);
  fs.writeFileSync(path.join(stagingDir, 'build-fingerprint.json'), `${JSON.stringify(payload.fingerprint, null, 2)}\n`);
  fs.writeFileSync(path.join(stagingDir, 'fixtures.json'), `${JSON.stringify(payload.fixtures, null, 2)}\n`);
  fs.writeFileSync(path.join(stagingDir, 'README.md'), `# Distinctive craft baseline\n\n- Generated: ${payload.manifest.generatedAt}\n- Rendered module owners: ${payload.manifest.coverage.renderedModules}\n- Screenshots: ${payload.captures.length + 1}\n- Authenticated desktop viewport: 1280×720\n- Public, auth, onboarding and legal viewports: 1440×900 and 390×844\n- Representative authenticated narrow gate: 390×844\n- Adapter route checks: ${payload.adapters.length}\n- Source fingerprint: ${payload.fingerprint.source.sha256}\n- Capture tool fingerprint: ${payload.fingerprint.captureTool.sha256}\n\nThis directory is capture evidence. It contains no browser storage state, E2E secret, or service-role credential.\n`);
  writeGallery(stagingDir, [...payload.captures, payload.narrowBoundary]);
}

const args = parseArgs(process.argv);
const authority = loadSurfaceAuthority();
if (args.has('plan')) {
  process.stdout.write(`${JSON.stringify({
    pageModules: authority.entries.length,
    renderedModules: authority.rendered.length,
    adapters: authority.adapters.length,
    expectedScreenshots: authority.expectedScreenshots,
    owners: authority.rendered.map((entry) => ({ id: entry.id, pathPattern: entry.pathPattern, pageModule: entry.pageModule, viewports: publicResponsiveOwner(entry) ? PUBLIC_VIEWPORTS.map((item) => item.name) : [APP_VIEWPORT.name] })),
    adapterOwners: authority.adapters.map((entry) => ({ id: entry.id, pathPattern: entry.pathPattern, pageModule: entry.pageModule })),
  }, null, 2)}\n`);
  process.exit(0);
}

loadEnvConfig(process.cwd());
if (process.env.RELEASE_E2E_LOCAL !== '1') throw new Error('Set RELEASE_E2E_LOCAL=1 to acknowledge local-only baseline capture');
const supabaseUrl = assertLoopbackUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? required('SUPABASE_URL'), 'Supabase URL');
const serviceRole = required('SUPABASE_SERVICE_ROLE_KEY');
const e2eSecret = required('E2E_AUTH_SECRET');
const baseURL = assertLoopbackUrl(String(args.get('base-url') ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3013'), 'Capture base URL');
const outputDir = path.resolve(String(args.get('output') ?? DEFAULT_OUTPUT));
const fixtureFile = path.resolve(String(args.get('fixtures') ?? DEFAULT_FIXTURES));
if (fs.existsSync(outputDir)) throw new Error(`Refused existing append-only capture directory ${outputDir}`);
const fixtures = readFixtureManifest(fixtureFile);
if (fixtures.supabaseOrigin !== new URL(supabaseUrl).origin) throw new Error('Fixture manifest Supabase origin does not match the active loopback project');
if (required('E2E_MERCHANT_ID') !== fixtures.merchantId) throw new Error('E2E_MERCHANT_ID does not match the distinctive fixture manifest');
const client = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
await validateDistinctiveFixtures(client, fixtures.merchantId, fixtures);
const resolved = await resolveRenderedRoutes(client, fixtures.merchantId, fixtures, authority.rendered);
const fingerprint = {
  generatedAt: new Date().toISOString(),
  source: sourceFingerprint(),
  git: gitFingerprint(),
  manifestSha256: sha256(fs.readFileSync('lib/surfaces/manifest.ts')),
  packageLockSha256: fs.existsSync('package-lock.json') ? sha256(fs.readFileSync('package-lock.json')) : null,
  node: process.version,
  next: require('next/package.json').version,
  playwright: require('@playwright/test/package.json').version,
  captureTool: {
    path: 'scripts/capture-distinctive-baseline.mjs',
    sha256: sha256(fs.readFileSync(new URL(import.meta.url))),
  },
  runtime: {
    baseURL,
    ownedByCaptureProcess: args.has('start-server'),
    mode: args.has('start-server') ? (args.has('production') ? 'next-production' : 'next-dev-webpack') : 'external-loopback',
  },
};

fs.mkdirSync(path.dirname(outputDir), { recursive: true });
const stagingDir = fs.mkdtempSync(`${outputDir}.in-progress-`);
const secretTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unauth-distinctive-auth-'));
const mainState = path.join(secretTempDir, 'main.json');
const onboardingState = path.join(secretTempDir, 'onboarding.json');
let runtime = null;
let browser = null;
try {
  if (args.has('start-server')) runtime = await startOwnedServer(baseURL, [fixtures.merchantId, fixtures.onboardingMerchantId], args.has('production'));
  else {
    const response = await fetch(`${baseURL}/legal/privacy`, { redirect: 'manual' }).catch(() => null);
    if (!response) throw new Error(`No loopback app is reachable at ${baseURL}; pass --start-server for an owned runtime`);
  }
  browser = await chromium.launch();
  await createAuthState(browser, baseURL, e2eSecret, fixtures.merchantId, '/legal/privacy?capture_session=main', mainState);
  await createAuthState(browser, baseURL, e2eSecret, fixtures.onboardingMerchantId, '/onboarding?capture_session=onboarding', onboardingState);
  const publicContexts = new Map();
  const mainContexts = new Map();
  const onboardingContexts = new Map();
  const contextFor = async (kind, viewport) => {
    const map = kind === 'public' ? publicContexts : kind === 'onboarding' ? onboardingContexts : mainContexts;
    const key = `${viewport.width}x${viewport.height}`;
    if (!map.has(key)) {
      map.set(key, await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: 'light',
        reducedMotion: 'reduce',
        locale: 'en-GB',
        timezoneId: 'Europe/London',
        storageState: kind === 'main' ? mainState : kind === 'onboarding' ? onboardingState : undefined,
      }));
    }
    return map.get(key);
  };
  const captures = [];
  for (let index = 0; index < resolved.routes.length; index += 1) {
    const { entry, route } = resolved.routes[index];
    const responsive = publicResponsiveOwner(entry);
    const viewports = responsive ? PUBLIC_VIEWPORTS : [APP_VIEWPORT];
    for (const viewport of viewports) {
      const onboarding = entry.shell === 'OnboardingShell';
      const kind = onboarding ? 'onboarding' : responsive ? 'public' : 'main';
      const context = await contextFor(kind, viewport);
      const record = await captureRoute({ context, baseURL, route, entry, viewport, stagingDir, sequence: index + 1, authenticated: kind !== 'public', onboarding });
      captures.push(record);
      process.stdout.write(`captured ${entry.id} ${viewport.name}\n`);
    }
  }
  const narrowContext = await contextFor('main', NARROW_GATE_VIEWPORT);
  const narrowRequested = new URL('/overview', baseURL);
  const narrowReady = await openNarrowBoundaryPage(narrowContext, narrowRequested);
  const narrowPage = narrowReady.page;
  let narrowBoundary;
  try {
    const final = new URL(narrowPage.url());
    if (final.pathname !== narrowRequested.pathname) throw new Error(`/overview narrow boundary resolved to ${final.pathname}`);
    const overflowX = await narrowPage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
    if (overflowX > 1) throw new Error(`/overview narrow boundary has ${overflowX}px page-level horizontal overflow`);
    const filename = 'authenticated-desktop-gate-390x844.png';
    const absoluteFile = path.join(stagingDir, filename);
    await narrowPage.screenshot({ path: absoluteFile, type: 'png', fullPage: false, animations: 'disabled', caret: 'hide' });
    const inspected = await inspectPng(absoluteFile, NARROW_GATE_VIEWPORT, filename);
    narrowBoundary = {
      stableSurfaceId: 'authenticated-desktop-boundary',
      finalUrl: narrowPage.url(),
      viewport: NARROW_GATE_VIEWPORT,
      artifact: filename,
      sha256: inspected.sha256,
      pixelSha256: inspected.pixelSha256,
      bytes: inspected.bytes.length,
      pngSignature: inspected.signature,
      raster: inspected.raster,
      diagnostics: { readinessFailures: narrowReady.failures, overflowX },
    };
  } finally {
    await narrowPage.close();
  }
  const adapterContext = await contextFor('main', APP_VIEWPORT);
  const marker = { phase: 'baseline', return: '/overview' };
  const adapters = [];
  for (const descriptor of [
    { id: 'controls-index-adapter', requested: `/controls?phase=${marker.phase}&return=${encodeURIComponent(marker.return)}`, expectedPath: '/controls/rules', expectedQuery: marker },
    { id: 'financials-index-adapter', requested: `/financials?phase=${marker.phase}&return=${encodeURIComponent(marker.return)}`, expectedPath: '/financials/losses', expectedQuery: marker },
    { id: 'sources-index-adapter', requested: `/sources?phase=${marker.phase}&return=${encodeURIComponent(marker.return)}`, expectedPath: '/sources/connected', expectedQuery: marker },
    { id: 'customer-claims-adapter', requested: `/customers/${resolved.ids.customerId}/claims?claimId=${resolved.ids.caseId}&phase=${marker.phase}`, expectedPath: `/cases/${resolved.ids.caseId}`, expectedQuery: { phase: marker.phase, return: `/customers/${resolved.ids.customerId}?tab=cases` } },
  ]) adapters.push(await verifyAdapter(adapterContext, baseURL, descriptor));
  const byPixelHash = new Map();
  for (const capture of captures) {
    const group = byPixelHash.get(capture.pixelSha256) ?? { owners: new Set(), artifacts: [] };
    group.owners.add(capture.stableSurfaceId);
    group.artifacts.push(capture.artifact);
    byPixelHash.set(capture.pixelSha256, group);
  }
  const duplicateFrameGroups = [...byPixelHash.entries()]
    .filter(([, group]) => group.artifacts.length > 1)
    .map(([pixelSha256, group]) => ({ pixelSha256, owners: [...group.owners].sort(), artifacts: group.artifacts.toSorted() }));
  const duplicateOwnerGroups = duplicateFrameGroups.filter((group) => group.owners.length > 1);
  const duplicatedOwnerPixels = new Set(duplicateOwnerGroups.map((group) => group.pixelSha256));
  const independentlyEvidencedOwners = new Set(
    captures
      .filter((capture) => !duplicatedOwnerPixels.has(capture.pixelSha256))
      .map((capture) => capture.stableSurfaceId),
  );
  const generatedAt = new Date().toISOString();
  const manifest = {
    schemaVersion: 1,
    generatedAt,
    baseURL,
    coverage: {
      pageModules: authority.entries.length,
      renderedModules: new Set(captures.map((capture) => capture.stableSurfaceId)).size,
      independentlyEvidencedRenderedModules: independentlyEvidencedOwners.size,
      adapterChecks: adapters.length,
      screenshots: captures.length + 1,
      pixelDistinctScreenshots: new Set([...captures, narrowBoundary].map((capture) => capture.pixelSha256)).size,
      duplicateFrameGroups,
      duplicateOwnerGroups,
    },
    viewports: { authenticated: APP_VIEWPORT, publicAuthOnboardingLegal: PUBLIC_VIEWPORTS, authenticatedNarrowGate: NARROW_GATE_VIEWPORT },
    sourceFingerprint: fingerprint.source.sha256,
    git: fingerprint.git,
    fixtureTag: fixtures.fixtureTag,
    artifacts: [...captures, narrowBoundary].map((capture) => ({
      stableSurfaceId: capture.stableSurfaceId,
      artifact: capture.artifact,
      sha256: capture.sha256,
      pixelSha256: capture.pixelSha256,
      viewport: capture.viewport,
      raster: capture.raster,
      pngSignature: capture.pngSignature,
    })),
  };
  const expectedRenderedCaptures = authority.expectedScreenshots - 1;
  if (captures.length !== expectedRenderedCaptures || manifest.coverage.renderedModules !== EXPECTED_RENDERED_MODULES || adapters.length !== EXPECTED_ADAPTERS) {
    throw new Error(`Coverage mismatch: ${captures.length} captures, ${manifest.coverage.renderedModules} rendered owners, ${adapters.length} adapters`);
  }
  if (independentlyEvidencedOwners.size !== EXPECTED_RENDERED_MODULES) {
    throw new Error(`Exact duplicate frames leave only ${independentlyEvidencedOwners.size}/${EXPECTED_RENDERED_MODULES} independently evidenced owners`);
  }
  writeEvidenceFiles(stagingDir, { captures, narrowBoundary, adapters, fingerprint, fixtures, manifest });
  fs.renameSync(stagingDir, outputDir);
  process.stdout.write(`Distinctive baseline complete: ${outputDir}\n`);
} catch (error) {
  const failedDir = `${outputDir}.failed-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const safeFailure = redactFailure(error, [e2eSecret, serviceRole]);
  try {
    const partialArtifacts = fs.readdirSync(stagingDir).filter((file) => file.endsWith('.png')).sort();
    const runtimeLogTail = runtime
      ? redactFailure(runtime.logTail().slice(-4_000), [e2eSecret, serviceRole])
      : null;
    fs.writeFileSync(path.join(stagingDir, 'failure.json'), `${JSON.stringify({
      failedAt: new Date().toISOString(),
      error: safeFailure,
      sourceFingerprint: fingerprint.source.sha256,
      captureToolSha256: fingerprint.captureTool.sha256,
      partialArtifacts,
      runtimeLogTail,
    }, null, 2)}\n`);
    fs.renameSync(stagingDir, failedDir);
  } catch {}
  throw new Error(safeFailure);
} finally {
  if (browser) await browser.close();
  await stopOwnedServer(runtime);
  fs.rmSync(secretTempDir, { recursive: true, force: true });
}
