#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { acceptanceRuntimeEnvironment, assertLoopbackUrl } from './acceptance/local-runtime.mjs';

const require = createRequire(import.meta.url);
const { LEGACY_UI_REDIRECTS } = require('../lib/navigation/aliases.js');
const base = assertLoopbackUrl(process.env.VISUAL_ALIAS_BASE_URL || 'http://127.0.0.1:3014', 'Visual alias base URL');
const outputRoot = process.argv[2] ?? path.join('artifacts', 'full-visual-authority-2026-09-02-final');
const receiptPath = path.join(outputRoot, 'alias-paths.json');

const fixture = {
  caseId: '68b5f5ad-3b25-49c9-9c27-d64aa0da3021',
  flowId: 'a1000000-0000-4000-8000-000000000040',
  ruleId: 'a1000000-0000-4000-8000-000000000030',
  lossId: '217aff6d-a45c-456d-adb2-8b950fe5812a',
  recoveryId: 'f1ce0536-2bab-4cc1-a9ab-370dbf9bbfdb',
};

function concrete(pattern) {
  return ({
    '/claims/:path*': `/claims/${fixture.caseId}`,
    '/flows/:path*': `/flows/${fixture.flowId}`,
    '/rules/:path*': `/rules/${fixture.ruleId}`,
    '/losses/:path*': `/losses/${fixture.lossId}`,
    '/recoveries/:path*': `/recoveries/${fixture.recoveryId}`,
    '/reports/:path*': '/reports/records',
    '/integrations/:path*': '/integrations/shopify',
    '/settings/integrations/:provider': '/settings/integrations/shopify',
    '/catches/:path*': '/catches/probe',
    '/chargebacks/:path*': '/chargebacks/probe',
    '/store/:path*': '/store/probe',
    '/lookup/:path*': '/lookup/probe',
    '/global/:path*': '/global/probe',
    '/graph/:path*': '/graph/probe',
    '/clusters/:path*': '/clusters/probe',
    '/watchlist/:path*': '/watchlist/probe',
    '/audit/:path*': '/audit/probe',
    '/report/:path*': '/report/probe',
    '/audits/:path*': '/audits/probe',
    '/history/:path*': '/history/probe',
    '/saved/:path*': '/saved/probe',
    '/upload/:path*': '/upload/probe',
    '/network-metrics/:path*': '/network-metrics/probe',
    '/eval/:path*': '/eval/probe',
  })[pattern] ?? pattern;
}

function expected(source, destination, concreteSource) {
  if (destination.includes(':provider')) {
    return destination.replace(':provider', concreteSource.slice(concreteSource.lastIndexOf('/') + 1));
  }
  if (!destination.includes(':path*')) return destination;
  const sourcePrefix = source.slice(0, source.indexOf('/:path*'));
  const suffix = concreteSource.slice(sourcePrefix.length) || '/probe';
  return destination.replace(':path*', suffix.replace(/^\//, ''));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(new URL('/landing', base));
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${base}`);
}

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', base.port], {
  cwd: process.cwd(),
  env: acceptanceRuntimeEnvironment({ port: base.port }),
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverErrors = '';
server.stderr.on('data', (chunk) => { serverErrors += chunk.toString(); });

try {
  await waitForServer();
  const results = [];
  for (const redirect of LEGACY_UI_REDIRECTS) {
    const source = concrete(redirect.source);
    const requestUrl = new URL(source, base);
    requestUrl.searchParams.set('alias_probe', '1');
    const response = await fetch(requestUrl, { redirect: 'manual' });
    const location = response.headers.get('location');
    const actual = location ? new URL(location, base) : null;
    const destination = new URL(expected(redirect.source, redirect.destination, source), base);
    const expectedQuery = new URLSearchParams(destination.search);
    expectedQuery.set('alias_probe', '1');
    const queryPass = actual && [...expectedQuery].every(([key, value]) => actual.searchParams.get(key) === value);
    const verdict = Boolean(actual && response.status >= 300 && response.status < 400 && actual.pathname === destination.pathname && queryPass);
    results.push({
      declaredSource: redirect.source,
      requested: `${requestUrl.pathname}${requestUrl.search}`,
      declaredDestination: redirect.destination,
      status: response.status,
      location,
      expectedPath: destination.pathname,
      pathPass: actual?.pathname === destination.pathname,
      queryPass: Boolean(queryPass),
      verdict,
    });
  }
  const receipt = {
    generatedAt: new Date().toISOString(),
    baseUrl: base.toString(),
    rootRedirectIncluded: LEGACY_UI_REDIRECTS.some(({ source }) => source === '/'),
    passed: results.filter(({ verdict }) => verdict).length,
    total: results.length,
    results,
  };
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ passed: receipt.passed, total: receipt.total, receiptPath, failures: results.filter(({ verdict }) => !verdict) }, null, 2));
  if (receipt.passed !== receipt.total) process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
  if (process.exitCode && serverErrors.trim()) console.error(serverErrors.trim());
}
