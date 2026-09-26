#!/usr/bin/env node

import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import nextEnv from '@next/env';
import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { acceptanceRuntimeEnvironment, runtimeSourceFingerprint } from './acceptance/local-runtime.mjs';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = nextEnv;
const ROOT = process.cwd();
const ARCHIVE = process.env.FULL_APP_VISUAL_AUTHORITY_ARCHIVE
  ?? '/Users/malikibrahim/Downloads/Cases page design directions.zip';
const ARCHIVE_SHA256 = '988c09688e0a02c9138307518c6504e647db5c3a2169081932aa1b747925d4aa';
const BASE_URL = process.env.VISUAL_PARITY_BASE_URL ?? 'http://127.0.0.1:3015';
const FIXTURES = path.resolve(process.argv[2] ?? 'artifacts/full-visual-authority-2026-09-03-exact-html-bound-v13/fixture-manifest.json');
const ISOLATED_OUTPUT = process.env.UNAUTH_PARITY_OUTPUT?.trim();
if (process.env.UNAUTH_VISUAL_FIXTURE_NAMESPACE && !ISOLATED_OUTPUT) throw new Error('Isolated parity requires a new evidence output directory.');
const OUTPUT = path.resolve(ISOLATED_OUTPUT || (process.env.PARITY_ONLY?.trim()
  ? 'artifacts/visual-authority/parity-focused'
  : 'artifacts/visual-authority/parity'));
if (ISOLATED_OUTPUT && fs.existsSync(OUTPUT)) throw new Error('Refused to overwrite existing parity evidence.');
const RECEIPT = ISOLATED_OUTPUT ? path.join(OUTPUT, 'reference-parity.json') : path.resolve('artifacts/visual-authority/reference-parity.json');
const PARTIAL_RECEIPT = ISOLATED_OUTPUT ? path.join(OUTPUT, 'reference-parity-partial.json') : path.resolve('artifacts/visual-authority/reference-parity-partial.json');
const requestedIds = new Set((process.env.PARITY_ONLY ?? '').split(',').map((value) => value.trim()).filter(Boolean));
const ROOT_ERROR_MARKER = path.resolve('artifacts/full-app-acceptance-2026-08-30/.root-global-error-active');
const ROUTE_ERROR_MARKER = path.resolve('artifacts/full-app-acceptance-2026-08-30/.route-error-boundaries-active');
const WAIT_MS = 120_000;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function firstJsonDifference(source, implementation, pathParts = []) {
  if (Object.is(source, implementation)) return null;
  if (Array.isArray(source) && Array.isArray(implementation)) {
    if (source.length !== implementation.length) {
      return {
        path: pathParts.join('.'),
        sourceLength: source.length,
        implementationLength: implementation.length,
        source,
        implementation,
      };
    }
    for (let index = 0; index < source.length; index += 1) {
      const difference = firstJsonDifference(source[index], implementation[index], [...pathParts, String(index)]);
      if (difference) return difference;
    }
    return null;
  }
  if (source && implementation && typeof source === 'object' && typeof implementation === 'object') {
    const sourceKeys = Object.keys(source).sort();
    const implementationKeys = Object.keys(implementation).sort();
    const keyDifference = firstJsonDifference(sourceKeys, implementationKeys, [...pathParts, 'keys']);
    if (keyDifference) return keyDifference;
    for (const key of sourceKeys) {
      const difference = firstJsonDifference(source[key], implementation[key], [...pathParts, key]);
      if (difference) return difference;
    }
    return null;
  }
  {
    return { path: pathParts.join('.'), source, implementation };
  }
}

function firstTextDifference(source, implementation) {
  if (source === implementation) return null;
  const limit = Math.min(source.length, implementation.length);
  let index = 0;
  while (index < limit && source[index] === implementation[index]) index += 1;
  return {
    index,
    source: source.slice(Math.max(0, index - 40), index + 80),
    implementation: implementation.slice(Math.max(0, index - 40), index + 80),
  };
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function assertLoopback(value, label) {
  const parsed = new URL(value);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(`${label} must be loopback; received ${parsed.hostname}`);
  }
  return parsed.toString().replace(/\/$/, '');
}

function parseStyle(value) {
  return String(value ?? '').split(';').map((item) => item.trim()).filter(Boolean).map((item) => {
    const separator = item.indexOf(':');
    return separator < 0
      ? [item.toLowerCase(), '']
      : [item.slice(0, separator).trim().toLowerCase(), item.slice(separator + 1).trim().replace(/\s+/g, ' ')];
  }).sort(([left], [right]) => left.localeCompare(right));
}

function archiveMarkupFingerprint(sourceId) {
  const { execFileSync } = require('node:child_process');
  const { parse } = require('parse5');
  const source = execFileSync('unzip', ['-p', ARCHIVE, `handoff/pages/${sourceId}.dc.html`], { encoding: 'utf8' });
  const document = parse(source);
  let screen = null;
  const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value ?? null;
  const walk = (node) => {
    if (attr(node, 'data-screen-label') !== null) screen = node;
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(document);
  if (!screen) throw new Error(`${sourceId}: missing archive screen root`);
  const contract = (node, root = false) => {
    if (node.nodeName === '#text') return ['text', String(node.value ?? '').replace(/\s+/g, ' ').trim()];
    if (node.nodeName === '#comment' || node.nodeName === '#documentType') return null;
    const attributes = (node.attrs ?? []).filter(({ name }) => name !== 'src' && name !== 'href').map(({ name, value }) => {
      if (name !== 'style') return [name, value];
      const removable = new Set(['width', 'flex', 'border-radius', 'box-shadow']);
      return [name, parseStyle(value).filter(([property, propertyValue]) => (
        !root || (!removable.has(property) && !(property === 'height' && /^(?:960|820|900)px$/.test(propertyValue)))
      ))];
    }).sort(([left], [right]) => left.localeCompare(right));
    return [node.nodeName, attributes, (node.childNodes ?? []).map((child) => contract(child, false)).filter(Boolean)];
  };
  return sha256(JSON.stringify(contract(screen, true)));
}

function loadAuthority() {
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node' });
  require('ts-node/register/transpile-only');
  require('tsconfig-paths/register');
  const manifest = require('../lib/surfaces/manifest.ts');
  return {
    references: manifest.designReferenceCrosswalk.filter((item) => item.kind === 'shipping'),
    surfaces: manifest.auditedSurfaceOwnership,
    scenarios: manifest.scenarioLedger,
  };
}

async function startServer(baseUrl, merchantIds) {
  const url = new URL(baseUrl);
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', url.hostname, '--port', url.port], {
    cwd: ROOT,
    env: { ...process.env, E2E_ALLOWED_MERCHANT_IDS: merchantIds.join(','), PLAYWRIGHT_BASE_URL: baseUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs = `${logs}${chunk}`.slice(-12_000); });
  child.stderr.on('data', (chunk) => { logs = `${logs}${chunk}`.slice(-12_000); });
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Parity server exited early. ${logs}`);
    const response = await fetch(`${baseUrl}/legal/privacy`, { redirect: 'manual' }).catch(() => null);
    if (response && response.status < 500) return { child, logs: () => logs };
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  child.kill('SIGTERM');
  throw new Error(`Parity server did not become ready. ${logs}`);
}

async function stopServer(runtime) {
  if (!runtime || runtime.child.exitCode !== null) return;
  runtime.child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => runtime.child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (runtime.child.exitCode === null) runtime.child.kill('SIGKILL');
}

async function createAuthState(browser, baseUrl, secret, merchantId, destination, output, memberRole = 'owner') {
  const context = await browser.newContext();
  const page = await context.newPage();
  const url = new URL('/api/test/e2e-auth', baseUrl);
  url.searchParams.set('secret', secret);
  url.searchParams.set('merchant_id', merchantId);
  url.searchParams.set('member_role', memberRole);
  url.searchParams.set('redirect', destination);
  const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: WAIT_MS });
  const workspace = await context.request.post(new URL('/api/workspace', baseUrl).toString(), { data: { merchantId } });
  if (!workspace.ok()) throw new Error(`Could not select parity workspace ${merchantId}: ${workspace.status()}`);
  await page.goto(new URL(destination, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: WAIT_MS });
  if (new URL(page.url()).pathname !== new URL(destination, baseUrl).pathname) {
    const responseText = await page.locator('body').innerText().catch(() => 'unavailable');
    throw new Error(`Could not create parity auth state for ${merchantId}; status ${response?.status() ?? 'unknown'}, landed on ${page.url()}: ${responseText.slice(0, 500)}`);
  }
  await context.storageState({ path: output });
  await context.close();
}

async function selectId(client, merchantId, table, configure = (query) => query) {
  let query = client.from(table).select('id').eq('merchant_id', merchantId);
  query = configure(query);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data?.id) throw new Error(`${table} parity fixture is unavailable: ${error?.message ?? 'missing row'}`);
  return data.id;
}

async function fixtureIds(client, fixtures) {
  const merchantId = fixtures.visualMerchantId ?? fixtures.merchantId;
  return {
    caseId: await selectId(client, merchantId, 'support_payout_cases', (query) => query.order('created_at')),
    customerId: await selectId(client, merchantId, 'source_customers', (query) => query.order('created_at')),
    lossId: await selectId(client, merchantId, 'loss_cases', (query) => query.order('created_at')),
    recoveryId: await selectId(client, merchantId, 'recovery_cases', (query) => query.order('created_at')),
    ruleId: await selectId(client, merchantId, 'merchant_rules', (query) => query.order('created_at')),
    shipmentId: await selectId(client, merchantId, 'source_shipments', (query) => query.order('created_at')),
    importJobId: await selectId(client, merchantId, 'sync_jobs', (query) => query.order('created_at')),
    order: await selectId(client, merchantId, 'source_orders', (query) => query.order('placed_at')),
    refund: await selectId(client, merchantId, 'source_refunds', (query) => query.order('ingested_at')),
    return: await selectId(client, merchantId, 'source_returns', (query) => query.order('created_at')),
    ticket: await selectId(client, merchantId, 'source_tickets', (query) => query.order('created_at_provider')),
    dispute: await selectId(client, merchantId, 'source_disputes', (query) => query.order('ingested_at')),
    workflowRun: await selectId(client, merchantId, 'workflow_runs', (query) => query.order('started_at')),
  };
}

function replaceOwner(owner, ids) {
  const values = {
    caseId: ids.caseId,
    id: ids.customerId,
    lossId: ids.lossId,
    recoveryId: ids.recoveryId,
    reportId: 'financial',
    ruleId: ids.ruleId,
    runId: ids.workflowRun,
    sourceId: 'shopify',
    providerId: 'shopify',
    jobId: ids.importJobId,
    articleSlug: 'case-investigation',
  };
  let route = owner;
  for (const [key, value] of Object.entries(values)) route = route.replace(`[${key}]`, value);
  return route;
}

function activation(reference, ids, fixtures) {
  const direct = new Map([
    ['Root-Not-Found-Clean', { kind: 'public', route: '/landing/parity-missing-page' }],
    ['Global-Error-Clean', { kind: 'public', route: '/demo', marker: true }],
    ['Command-Palette-Clean', { kind: 'main', route: '/financials/reports', palette: true }],
    ['First-Run-Clean', { kind: 'first-run', route: '/overview' }],
    ['Overview-Clean', { kind: 'main', route: '/overview' }],
    ['Work-Clean', { kind: 'main', route: '/work' }],
    ['Cases-Clean', { kind: 'main', route: '/cases' }],
    ['Loading-Registry-Clean', { kind: 'main', route: '/customers', scenario: 'customers-registry-loading', loading: true }],
    ['Loading-Detail-Clean', { kind: 'main', route: `/customers/${ids.customerId}`, scenario: 'operational-detail-loading-skeleton', loading: true }],
    ['Not-Found-Clean', { kind: 'main', route: '/overview', scenario: 'authenticated-not-found' }],
    ['Route-Error-Clean', { kind: 'main', route: '/overview', scenario: 'route-error-boundaries', routeError: true }],
    ['Desktop-Required-Clean', { kind: 'portable', route: '/overview' }],
    // The adopted demo has three steps. Keep the original comparisons intact;
    // these captures expose the revised runtime instead of timing out on a
    // retired data-screen-label or manufacturing stored decision prerequisites.
    ['Demo-Context-Clean', { kind: 'public', route: '/demo?case=legitimate&step=inspect', demo: 'inspect' }],
    ['Demo-Sources-Clean', { kind: 'public', route: '/demo?case=legitimate&step=inspect', demo: 'inspect' }],
    ['Demo-Clean', { kind: 'public', route: '/demo?case=legitimate&step=decide', demo: 'decide' }],
    ['Demo-Decision-Clean', { kind: 'public', route: '/demo?case=legitimate&step=decide', demo: 'review' }],
    ['Demo-Recovery-Clean', { kind: 'public', route: '/demo?case=recoverable&step=decide', demo: 'recovery' }],
    ['Login-Clean', { kind: 'public', route: '/login?next=%2Fwork%3Fpriority%3Dhigh' }],
    ['Signup-Clean', { kind: 'public', route: '/signup?plan=growth' }],
    ['Reset-Clean', { kind: 'public', route: '/reset' }],
    ['Reset-Update-Clean', { kind: 'public', route: '/reset/update?next=%2Fwork' }],
    ['Onboarding-Store-Clean', { kind: 'onboarding', route: '/onboarding?step=store' }],
    ['Onboarding-Commerce-Clean', { kind: 'onboarding', route: '/onboarding?step=commerce' }],
    ['Onboarding-Helpdesk-Clean', { kind: 'onboarding', route: '/onboarding?step=helpdesk' }],
    ['Onboarding-Ready-Clean', { kind: 'onboarding', route: '/onboarding?step=ready' }],
    ['Write-Off-Clean', { kind: 'main', route: `/financials/losses/${ids.lossId}?action=write-off` }],
    ['File-Claim-Clean', { kind: 'main', route: `/financials/recovery/new?case=${ids.caseId}` }],
    ['Period-Close-Clean', { kind: 'main', route: '/financials/reconciliation?period=2026-08&action=close' }],
    ['Source-Repair-Clean', { kind: 'main', route: '/sources/shopify?tab=repair' }],
    ['Mapping-Repair-Clean', { kind: 'main', route: `/sources/imports/${ids.importJobId}?step=mapping` }],
    ['Report-Records-Clean', { kind: 'main', route: '/financials/reports/records?reportId=financial' }],
    ['Order-Detail-Clean', { kind: 'main', route: `/orders/${ids.order}` }],
    ['Refund-Detail-Clean', { kind: 'main', route: `/refunds/${ids.refund}` }],
    ['Return-Detail-Clean', { kind: 'main', route: `/returns/${ids.return}` }],
    ['Shipment-Detail-Clean', { kind: 'main', route: `/shipments/${ids.shipmentId}` }],
    ['Ticket-Detail-Clean', { kind: 'main', route: `/tickets/${ids.ticket}` }],
    ['Dispute-Detail-Clean', { kind: 'main', route: `/disputes/${ids.dispute}` }],
    ['Flow-Run-Detail-Clean', { kind: 'main', route: `/controls/flows/runs/${ids.workflowRun}` }],
  ]);
  if (direct.has(reference.id)) return direct.get(reference.id);
  const kind = reference.owner === '/onboarding'
    ? 'onboarding'
    : ['/login', '/signup', '/reset', '/reset/update'].includes(reference.owner) || reference.owner.startsWith('/legal/') || ['/landing', '/pricing', '/demo'].includes(reference.owner)
      ? 'public'
      : 'main';
  return { kind, route: replaceOwner(reference.owner, ids) };
}

async function pageContract(root) {
  return root.evaluate((element) => {
    const rootRect = element.getBoundingClientRect();
    const ignored = (name) => name === 'class' || name === 'style-hover' || name === 'href' || name === 'src' || name === 'id' || name === 'role' || name === 'tabindex' || ['type', 'disabled', 'value', 'placeholder', 'autocomplete', 'name', 'checked', 'readonly'].includes(name) || name.startsWith('aria-') || name.startsWith('on') || (name.startsWith('data-') && !['data-screen-label', 'hint-placeholder-val'].includes(name));
    const removableRootStyles = new Set(['width', 'flex', 'border-radius', 'box-shadow']);
    const normalizeChildren = (children) => {
      const normalized = [];
      for (const child of children) {
        if (child?.[0] === 'text' && normalized.at(-1)?.[0] === 'text') continue;
        normalized.push(child);
      }
      return normalized;
    };
    const structure = (node, isRoot = false) => {
      if (node instanceof Element && node.hasAttribute('data-reference-ignore')) return null;
      if (node.nodeType === Node.TEXT_NODE) return /\S/.test(node.textContent ?? '') ? ['text'] : null;
      if (!(node instanceof Element)) return null;
      const attrs = Array.from(node.attributes).filter((attribute) => !ignored(attribute.name)).map((attribute) => {
        if (attribute.name !== 'style') return [attribute.name, attribute.value];
        return ['style', Array.from(node.style)
          .filter((property) => !isRoot || (!removableRootStyles.has(property) && !(property === 'height' && /^(?:960|820|900)px$/.test(node.style.getPropertyValue(property)))))
          .map((property) => [property, node.style.getPropertyValue(property).replace(/\s+/g, ' ').trim()])
          .sort(([left], [right]) => left.localeCompare(right))];
      }).sort(([left], [right]) => left.localeCompare(right));
      const children = node instanceof HTMLInputElement && node.getAttribute('data-reference-tag') === 'span'
        ? (node.value || node.placeholder ? [['text']] : [])
        : normalizeChildren(Array.from(node.childNodes).map((child) => structure(child, false)).filter(Boolean));
      return [node.getAttribute('data-reference-tag') || node.tagName.toLowerCase(), attrs, children];
    };
    const geometry = [element, ...element.querySelectorAll('*')].filter((node) => !node.closest('[data-reference-ignore]')).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        tag: node.getAttribute('data-reference-tag') || node.tagName.toLowerCase(),
        x: Math.round((rect.x - rootRect.x) * 100) / 100,
        y: Math.round((rect.y - rootRect.y) * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      };
    });
    const svg = Array.from(element.querySelectorAll('svg')).map((item) => ({
      viewBox: item.getAttribute('viewBox') ?? '', width: item.getAttribute('width') ?? '', height: item.getAttribute('height') ?? '',
      paths: Array.from(item.querySelectorAll('path')).map((path) => path.getAttribute('d') ?? ''),
    }));
    const navigation = Array.from(element.querySelectorAll('div')).map((node) => String(node.textContent ?? '').replace(/\s+/g, ' ').trim()).filter((text) => ['Act on work', 'Trace money', 'Configure & connect', 'Workspace'].includes(text));
    const exactText = (root) => {
      const tokens = [];
      const visit = (node) => {
        if (node instanceof Element && node.hasAttribute('data-reference-ignore')) return;
        if (node instanceof HTMLInputElement && node.getAttribute('data-reference-tag') === 'span') {
          const raw = node.type === 'password' && node.value
            ? '•'.repeat(node.value.length)
            : node.value || node.placeholder || '';
          const value = String(raw).replace(/\s+/g, ' ').trim();
          if (value) tokens.push(value);
          return;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          const value = String(node.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (value) tokens.push(value);
          return;
        }
        for (const child of node.childNodes ?? []) visit(child);
      };
      visit(root);
      return tokens.join(' ');
    };
    return {
      structure: structure(element, true),
      unresolvedNavigationTargets: Array.from(element.querySelectorAll('a[href]'))
        .filter((node) => /\.dc\.html(?:$|[?#])/i.test(node.getAttribute('href') ?? '') || (node.getAttribute('href') === '#' && node.getAttribute('role') !== 'button'))
        .map((node) => ({ text: (node.textContent ?? '').trim(), href: node.getAttribute('href') })),
      geometry,
      text: exactText(element),
      controls: (() => {
        const tags = [element, ...element.querySelectorAll('*')].map((node) => node.getAttribute('data-reference-tag') || node.tagName.toLowerCase());
        return {
          links: tags.filter((tag) => tag === 'a').length,
          buttons: tags.filter((tag) => tag === 'button').length,
          inputs: tags.filter((tag) => tag === 'input').length,
          selects: tags.filter((tag) => tag === 'select').length,
          textareas: tags.filter((tag) => tag === 'textarea').length,
        };
      })(),
      navigation,
      svg,
      viewport: { width: Math.round(rootRect.width), height: Math.round(rootRect.height) },
    };
  });
}

async function pixelComparison(sourceFile, implementationFile) {
  const sourceMeta = await sharp(sourceFile).metadata();
  const implementationMeta = await sharp(implementationFile).metadata();
  if (sourceMeta.width !== implementationMeta.width || sourceMeta.height !== implementationMeta.height) {
    return { differingPixels: (sourceMeta.width ?? 0) * (sourceMeta.height ?? 0), allowedPixels: 0, fontAntialiasingOnly: false, source: sourceMeta, implementation: implementationMeta };
  }
  const source = await sharp(sourceFile).ensureAlpha().raw().toBuffer();
  const implementation = await sharp(implementationFile).ensureAlpha().raw().toBuffer();
  let differingPixels = 0;
  for (let index = 0; index < source.length; index += 4) {
    if (source[index] !== implementation[index] || source[index + 1] !== implementation[index + 1] || source[index + 2] !== implementation[index + 2] || source[index + 3] !== implementation[index + 3]) differingPixels += 1;
  }
  // A small pixel count does not establish that differences are font edges.
  // Until an edge-classifying comparison is implemented, fail closed on every
  // differing pixel instead of labelling arbitrary changes as antialiasing.
  return { differingPixels, allowedPixels: 0, fontAntialiasingOnly: differingPixels === 0 };
}

Object.assign(process.env, acceptanceRuntimeEnvironment({ port: new URL(BASE_URL).port || '3015' }));
const sourceFingerprint = runtimeSourceFingerprint(ROOT);
const buildReceipt = JSON.parse(fs.readFileSync('artifacts/full-app-acceptance-2026-08-30/build-environment.json', 'utf8'));
if (buildReceipt.status !== 'passed' || buildReceipt.sourceStable !== true || buildReceipt.runtimeSourceFingerprint !== sourceFingerprint || buildReceipt.buildId !== fs.readFileSync('.next/BUILD_ID', 'utf8').trim()) throw new Error('Build the current runtime sources before capturing parity.');
process.env.UNAUTH_CLOCK_AS_OF = '2026-09-01T10:00:00.000Z';
loadEnvConfig(ROOT);
if (process.env.RELEASE_E2E_LOCAL !== '1' || process.env.VERCEL_ENV === 'production') throw new Error('Reference parity requires guarded local acceptance mode');
const secret = process.env.E2E_AUTH_SECRET?.trim() || crypto.randomBytes(32).toString('base64url');
process.env.E2E_AUTH_SECRET = secret;
assertLoopback(BASE_URL, 'Parity app URL');
assertLoopback(process.env.NEXT_PUBLIC_SUPABASE_URL ?? required('SUPABASE_URL'), 'Parity Supabase URL');
if (sha256(fs.readFileSync(ARCHIVE)) !== ARCHIVE_SHA256) throw new Error('Visual authority archive checksum mismatch');
const asterlaneVerify = spawnSync(process.execPath, ['scripts/seed-enterprise-demo.mjs', '--verify-only'], {
  cwd: ROOT,
  env: process.env,
  shell: false,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (asterlaneVerify.status !== 0) {
  const asterlaneSeed = spawnSync(process.execPath, ['scripts/seed-enterprise-demo.mjs'], {
    cwd: ROOT,
    env: process.env,
    shell: false,
    stdio: 'inherit',
  });
  if (asterlaneSeed.error) throw asterlaneSeed.error;
  if (asterlaneSeed.status !== 0) throw new Error(`Could not prepare canonical Asterlane visual fixture (exit ${asterlaneSeed.status ?? 'unknown'})`);
} else {
  process.stdout.write('Canonical Asterlane visual fixture verified on loopback Supabase.\n');
}
const prepared = spawnSync(process.execPath, ['scripts/prepare-distinctive-capture-fixtures.mjs', '--manifest', FIXTURES], {
  cwd: ROOT,
  env: process.env,
  shell: false,
  stdio: 'inherit',
});
if (prepared.error) throw prepared.error;
if (prepared.status !== 0) throw new Error(`Could not prepare reference-parity fixtures (exit ${prepared.status ?? 'unknown'})`);
const fixtures = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
if (!fixtures.localOnly) throw new Error('Reference parity fixture must be local-only');
const authority = loadAuthority();
const references = JSON.parse(fs.readFileSync('artifacts/visual-authority/supplied-reference/reference-manifest.json', 'utf8'));
const referenceById = new Map(references.records.map((record) => [record.sourceId, record]));
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const ids = await fixtureIds(client, fixtures);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'unauth-parity-'));
const mainState = path.join(temp, 'main.json');
const onboardingState = path.join(temp, 'onboarding.json');
const firstRunState = path.join(temp, 'first-run.json');
const firstRunMerchantId = crypto.randomUUID();
const captureFirstRun = requestedIds.size === 0 || requestedIds.has('First-Run-Clean');
let firstRunCreated = false;
let firstRunOwnerId = null;
let firstRunPreviousActiveMerchantId = null;
if (!ISOLATED_OUTPUT) fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUTPUT, 'implementation'), { recursive: true });
let runtime;
let browser;
try {
  if (captureFirstRun) {
    const owner = await client.from('merchant_users').select('user_id,invited_email').eq('merchant_id', fixtures.onboardingMerchantId).eq('role', 'owner').eq('invite_status', 'active').limit(1).single();
    if (owner.error || !owner.data?.user_id || !/\.(?:test|invalid)$/.test(owner.data.invited_email ?? '')) throw new Error('First-run capture requires the existing disposable test owner');
    firstRunOwnerId = owner.data.user_id;
    const merchant = await client.from('merchants').insert({ id: firstRunMerchantId, name: 'Asterlane', is_demo: true, is_internal: true, settings: { fixture: 'reference-parity-first-run', setup_complete: true, timezone: 'Europe/London' } });
    if (merchant.error) throw new Error(`First-run fixture creation failed: ${merchant.error.code}`);
    firstRunCreated = true;
    const member = await client.from('merchant_users').insert({ merchant_id: firstRunMerchantId, user_id: owner.data.user_id, invited_email: owner.data.invited_email, role: 'owner', invite_status: 'active', accepted_at: '2026-09-01T09:00:00Z' });
    if (member.error) throw new Error(`First-run fixture membership failed: ${member.error.code}`);
  }
  runtime = await startServer(BASE_URL, [fixtures.visualMerchantId, fixtures.merchantId, fixtures.onboardingMerchantId, ...(captureFirstRun ? [firstRunMerchantId] : [])]);
  browser = await chromium.launch({ headless: true });
  await createAuthState(browser, BASE_URL, secret, fixtures.visualMerchantId, '/legal/privacy', mainState, fixtures.visualMemberRole);
  await createAuthState(browser, BASE_URL, secret, fixtures.onboardingMerchantId, '/onboarding?step=store', onboardingState);
  if (captureFirstRun) {
    const owner = await client.auth.admin.getUserById(firstRunOwnerId);
    if (owner.error || !owner.data.user) throw new Error('Could not preserve the disposable owner workspace preference');
    firstRunPreviousActiveMerchantId = owner.data.user.user_metadata.active_merchant_id ?? null;
    await createAuthState(browser, BASE_URL, secret, firstRunMerchantId, '/overview', firstRunState);
  }
  const contexts = new Map();
  const contextFor = async (kind, viewport) => {
    const key = `${kind}:${viewport.width}x${viewport.height}`;
    if (!contexts.has(key)) contexts.set(key, await browser.newContext({
      ...(kind === 'portable' ? devices['iPad Mini'] : {}),
      viewport,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
      locale: 'en-GB',
      timezoneId: 'Europe/London',
      storageState: kind === 'main' || kind === 'portable' ? mainState : kind === 'onboarding' ? onboardingState : kind === 'first-run' ? firstRunState : undefined,
    }));
    return contexts.get(key);
  };
  const records = [];
  for (const reference of authority.references.filter((item) => requestedIds.size === 0 || requestedIds.has(item.id))) {
    const source = referenceById.get(reference.id);
    if (!source) throw new Error(`${reference.id}: missing deterministic reference record`);
    const target = activation(reference, ids, fixtures);
    if (!source.browserViewport) throw new Error(`${reference.id}: reference does not record its browser viewport; recapture the source before comparison`);
    const context = await contextFor(target.kind, source.browserViewport);
    const page = await context.newPage();
    try {
      if (target.missingActivation) throw new Error(target.missingActivation);
      if (target.scenario) await page.setExtraHTTPHeaders({ 'x-unauth-acceptance-scenario': target.scenario });
      if (target.routeError) {
        fs.mkdirSync(path.dirname(ROUTE_ERROR_MARKER), { recursive: true });
        fs.writeFileSync(ROUTE_ERROR_MARKER, 'route-error-boundaries\n');
      }
      if (target.marker) {
        fs.mkdirSync(path.dirname(ROOT_ERROR_MARKER), { recursive: true });
        fs.writeFileSync(ROOT_ERROR_MARKER, 'root-global-error\n');
      }
      await page.goto(new URL(target.route, BASE_URL).toString(), { waitUntil: target.loading ? 'commit' : 'domcontentloaded', timeout: WAIT_MS });
      if (target.palette) {
        await page.waitForLoadState('networkidle');
        await page.keyboard.press('Control+k');
        await page.getByRole('searchbox', { name: 'Search records or navigate' }).fill('88214');
        await page.waitForResponse((response) => response.url().includes('/api/search?q=88214'));
      }
      // A mounted shell is not a loaded page. Let client data requests finish
      // before comparing normal pages; explicit loading references stay loading.
      if (!reference.id.startsWith('Loading-')) {
        await page.waitForLoadState('networkidle', { timeout: 30_000 });
        await page.waitForFunction(() => [...document.querySelectorAll('[role="status"][aria-label^="Loading"]')]
          .every((node) => node.getClientRects().length === 0), null, { timeout: 30_000 });
      }
      if (target.demo === 'review' || target.demo === 'recovery') {
        await page.getByRole('button', { name: target.demo === 'recovery' ? 'Review refund and prepare recovery' : 'Review refund', exact: true }).click();
        if (target.demo === 'recovery') {
          await page.getByRole('button', { name: 'Confirm simulated decision' }).click();
          await page.getByRole('button', { name: 'Simulate recovery submitted' }).click();
        }
      }
      const root = target.demo
        ? page.locator('[data-surface-id="interactive-product-demo"]')
        : page.locator(`[data-screen-label="${source.screenLabel.replaceAll('"', '\\"')}"]`).first();
      await root.waitFor({ state: 'visible', timeout: 30_000 });
      await page.evaluate(async () => { await document.fonts.ready; await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      const implementation = await pageContract(root);
      const implementationScreenshot = path.join(OUTPUT, 'implementation', `${reference.id}.png`);
      const uncroppedScreenshot = `${implementationScreenshot}.uncropped.png`;
      await root.screenshot({ path: uncroppedScreenshot, type: 'png', animations: 'disabled', caret: 'hide' });
      const uncroppedMeta = await sharp(uncroppedScreenshot).metadata();
      const paddedScreenshot = await sharp(uncroppedScreenshot)
        .extend({
          right: Math.max(0, source.viewport.width - (uncroppedMeta.width ?? 0)),
          bottom: Math.max(0, source.viewport.height - (uncroppedMeta.height ?? 0)),
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toBuffer();
      await sharp(paddedScreenshot)
        .extract({ left: 0, top: 0, width: source.viewport.width, height: source.viewport.height })
        .png()
        .toFile(implementationScreenshot);
      fs.unlinkSync(uncroppedScreenshot);
      const implementationMarkupFingerprint = sha256(JSON.stringify(implementation.structure));
      const implementationCopyFingerprint = sha256(implementation.text);
      const implementationGeometrySha256 = sha256(JSON.stringify(implementation.geometry));
      const implementationSvgSha256 = sha256(JSON.stringify(implementation.svg));
      const pixel = await pixelComparison(path.resolve(source.screenshot), implementationScreenshot);
      const structureMatch = source.sourceMarkupFingerprint === implementationMarkupFingerprint;
      const copyMatch = source.textSha256 === implementationCopyFingerprint;
      const iconMatch = source.svgSha256 === implementationSvgSha256;
      const geometryMatch = source.geometrySha256 === implementationGeometrySha256;
      const navigationGroupingMatch = JSON.stringify(source.navigationGroups) === JSON.stringify(implementation.navigation);
      const controlCountMatch = JSON.stringify(source.controls) === JSON.stringify(implementation.controls);
      records.push({
        id: reference.id,
        canonicalRoute: reference.owner,
        activatedUrl: page.url(),
        activationNote: target.demo
          ? `Adopted three-step demo: ${target.demo}. Historical source comparison remains strict; this capture is not approval of the revised visual baseline.`
          : target.kind === 'portable' ? 'Tablet user agent and touch capability activate the device boundary; source viewport dimensions are preserved.' : null,
        sourceMarkupFingerprint: archiveMarkupFingerprint(reference.id),
        implementationMarkupFingerprint,
        implementationCopyFingerprint,
        iconSignature: { source: source.svgSha256, implementation: implementationSvgSha256 },
        geometry: { source: source.geometrySha256, implementation: implementationGeometrySha256, sourceViewport: source.viewport, implementationViewport: implementation.viewport },
        browserViewport: { source: source.browserViewport, implementation: page.viewportSize() },
        controlCount: { source: source.controls, implementation: implementation.controls },
        controlCountMatch,
        navigationTargetsValid: implementation.unresolvedNavigationTargets.length === 0,
        unresolvedNavigationTargets: implementation.unresolvedNavigationTargets,
        navigationGrouping: { source: source.navigationGroups, implementation: implementation.navigation },
        sourceScreenshot: source.screenshot,
        implementationScreenshot: path.relative(ROOT, implementationScreenshot),
        structureMatch,
        structureDifference: structureMatch ? null : firstJsonDifference(source.structure, implementation.structure),
        copyMatch,
        copyDifference: copyMatch ? null : firstTextDifference(source.text, implementation.text),
        iconMatch,
        geometryMatch,
        geometryDifference: geometryMatch ? null : firstJsonDifference(source.geometry, implementation.geometry),
        navigationGroupingMatch,
        pixelComparison: pixel,
        intentionalVisualDifferences: [],
        // A page capture cannot certify unrendered states or permissions.
        verifiedStates: [],
        verifiedOverlays: [],
        verifiedPermissionSurfaces: [],
        ...(process.env.PARITY_INCLUDE_CONTRACTS === '1' ? {
          debugContracts: { sourceStructure: source.structure, implementationStructure: implementation.structure },
        } : {}),
      });
      if (process.env.PARITY_DEBUG === '1' && !structureMatch) {
        process.stdout.write(`${reference.id} structure ${JSON.stringify(firstJsonDifference(source.structure, implementation.structure)).slice(0, 2000)}\n`);
      }
      process.stdout.write(`${reference.id}: ${structureMatch && copyMatch && iconMatch && geometryMatch && controlCountMatch && navigationGroupingMatch && pixel.fontAntialiasingOnly ? 'match' : 'DIFF'} (${pixel.differingPixels}/${pixel.allowedPixels} pixels)\n`);
    } catch (error) {
      const failureScreenshot = path.join(OUTPUT, 'implementation', `${reference.id}.failed.png`);
      await page.screenshot({ path: failureScreenshot, animations: 'disabled' }).catch(() => {});
      const renderedLabels = await page.locator('[data-screen-label]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-screen-label'))).catch(() => []);
      records.push({
        id: reference.id,
        canonicalRoute: reference.owner,
        activatedUrl: page.url(),
        structureMatch: false,
        copyMatch: false,
        iconMatch: false,
        geometryMatch: false,
        controlCountMatch: false,
        navigationGroupingMatch: false,
        pixelComparison: { fontAntialiasingOnly: false },
        captureError: error instanceof Error ? error.message : String(error),
        failureScreenshot,
        renderedLabels,
        verifiedStates: [], verifiedOverlays: [], verifiedPermissionSurfaces: [],
      });
      process.stdout.write(`${reference.id}: CAPTURE FAILED (${error instanceof Error ? error.message.split('\n')[0] : String(error)})\n`);
      if (process.env.PARITY_DEBUG === '1') process.stdout.write(`${runtime.logs()}\n`);
    } finally {
      // Preserve completed comparisons even if a later route cannot render.
      fs.writeFileSync(PARTIAL_RECEIPT, `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        buildId: fs.readFileSync(path.join(ROOT, '.next', 'BUILD_ID'), 'utf8').trim(),
        archiveSha256: ARCHIVE_SHA256,
        complete: false,
        records,
        verifiedSurfaceIds: [], verifiedScenarioIds: [],
      }, null, 2)}\n`);
      if (target.marker && fs.existsSync(ROOT_ERROR_MARKER)) fs.unlinkSync(ROOT_ERROR_MARKER);
      if (target.routeError && fs.existsSync(ROUTE_ERROR_MARKER)) fs.unlinkSync(ROUTE_ERROR_MARKER);
      await page.close();
    }
  }
  for (const context of contexts.values()) await context.close();
  const currentLedgerPath = path.resolve('artifacts/full-app-acceptance-2026-08-30/acceptance-ledger.json');
  const ledger = fs.existsSync(currentLedgerPath) ? JSON.parse(fs.readFileSync(currentLedgerPath, 'utf8')) : null;
  const ledgerCurrent = ledger?.coverage?.auditedSurfaces === authority.surfaces.length
    && ledger?.coverage?.scenarios === authority.scenarios.length
    && ledger?.acceptance?.scenarioVerdicts?.passed === authority.scenarios.length;
  const receipt = {
    schemaVersion: 1,
    runtimeSourceFingerprint: sourceFingerprint,
    generatedAt: new Date().toISOString(),
    buildId: fs.readFileSync(path.join(ROOT, '.next', 'BUILD_ID'), 'utf8').trim(),
    archiveSha256: ARCHIVE_SHA256,
    sourceComparison: 'rendered-source-vs-canonical-route',
    fontAntialiasingOnlyTolerance: true,
    acceptanceLedger: ledgerCurrent ? path.relative(ROOT, currentLedgerPath) : null,
    records,
    // A functional ledger does not establish visual parity for its states.
    // Individual rendered comparisons must populate coverage, never counts.
    verifiedSurfaceIds: [],
    verifiedScenarioIds: [],
  };
  const receiptPath = requestedIds.size ? PARTIAL_RECEIPT : RECEIPT;
  if (runtimeSourceFingerprint(ROOT) !== sourceFingerprint) throw new Error('Runtime source changed during reference capture; no final parity receipt can be accepted.');
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  const failed = records.filter((record) => !record.structureMatch || !record.copyMatch || !record.iconMatch || !record.geometryMatch || !record.controlCountMatch || !record.navigationTargetsValid || !record.navigationGroupingMatch || !record.pixelComparison.fontAntialiasingOnly);
  if (failed.length) throw new Error(`Reference parity failed for ${failed.length}/${records.length} pages: ${failed.map((record) => record.id).join(', ')}`);
  if (!requestedIds.size && !ledgerCurrent) throw new Error('Reference pixels matched, but the current 120-surface/223-scenario acceptance ledger is not yet green');
  console.log(`Reference parity complete: ${path.relative(ROOT, receiptPath)}`);
} finally {
  if (fs.existsSync(ROOT_ERROR_MARKER)) fs.unlinkSync(ROOT_ERROR_MARKER);
  if (browser) await browser.close();
  await stopServer(runtime);
  try {
   if (firstRunCreated) {
    if (firstRunOwnerId) {
      const owner = await client.auth.admin.getUserById(firstRunOwnerId);
      if (owner.error || !owner.data.user) throw new Error('Could not verify the retained fixture identity');
      if (owner.data.user.user_metadata.active_merchant_id === firstRunMerchantId) {
        const restored = await client.auth.admin.updateUserById(firstRunOwnerId, { user_metadata: { ...owner.data.user.user_metadata, active_merchant_id: firstRunPreviousActiveMerchantId } });
        if (restored.error || restored.data.user?.user_metadata.active_merchant_id !== firstRunPreviousActiveMerchantId) throw new Error('Could not restore the disposable owner workspace preference');
      }
    }
    const fixture = await client.from('merchants').select('id,settings,is_demo,is_internal').eq('id', firstRunMerchantId).single();
    if (fixture.error || fixture.data.settings?.fixture !== 'reference-parity-first-run' || !fixture.data.is_demo || !fixture.data.is_internal) throw new Error('Refusing cleanup of an unverified First-run fixture');
    const owner = await client.from('merchant_users').select('user_id,invited_email').eq('merchant_id', firstRunMerchantId).eq('role', 'owner').eq('invite_status', 'active').single();
    if (owner.error || !/\.(?:test|invalid)$/.test(owner.data?.invited_email ?? '')) throw new Error('Refusing cleanup without the disposable fixture owner');
    const { buildWorkspaceDeletionPreflight, createWorkspaceDeletionJob, resumeWorkspaceDeletionJob } = require('../lib/privacy/workspaceDeletion.ts');
    const { preflight, storageManifest } = await buildWorkspaceDeletionPreflight(client, firstRunMerchantId);
    if (storageManifest.some((target) => target.paths?.length) || Object.entries(preflight.rowCounts).some(([key, count]) => count !== (key === 'members' ? 1 : 0))) throw new Error('First-run fixture is no longer empty; refusing automatic cleanup');
    const job = await createWorkspaceDeletionJob(client, { merchantId: firstRunMerchantId, actorUserId: owner.data.user_id, idempotencyKey: crypto.randomUUID() });
    const completed = await resumeWorkspaceDeletionJob(client, job);
    if (completed.status !== 'completed') throw new Error(`First-run fixture cleanup did not complete: ${completed.id}`);
    const check = await client.from('merchants').select('id').eq('id', firstRunMerchantId).maybeSingle();
    if (check.error || check.data) throw new Error(`Disposable First-run fixture cleanup was not confirmed: ${firstRunMerchantId}`);
    process.stdout.write(`Disposable First-run workspace removed and absence verified: ${firstRunMerchantId}\n`);
   }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
