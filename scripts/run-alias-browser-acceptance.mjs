import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { assertLoopbackUrl, requireRolePassword } from './acceptance/local-runtime.mjs';

if (process.env.RELEASE_E2E_LOCAL !== '1') {
  throw new Error('Set RELEASE_E2E_LOCAL=1 to acknowledge this local-only alias pass');
}

const baseUrl = process.env.ROLE_ACCEPTANCE_BASE_URL?.trim() || 'http://127.0.0.1:3016';
const base = assertLoopbackUrl(baseUrl, 'Alias browser base URL');
const password = requireRolePassword();
const require = createRequire(import.meta.url);
const { LEGACY_UI_REDIRECTS } = require('../lib/navigation/aliases.js');
const artifactDir = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30', 'physical');
fs.mkdirSync(artifactDir, { recursive: true });
const roleFixturePath = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30', 'role-fixture.json');
const roleFixture = JSON.parse(fs.readFileSync(roleFixturePath, 'utf8'));
const roleOwnerEmail = roleFixture.accounts?.find((account) => account.id === 'owner')?.email;
if (!roleOwnerEmail) throw new Error('Alias acceptance requires the prepared role owner fixture');

const fixture = {
  caseId: '68b5f5ad-3b25-49c9-9c27-d64aa0da3021',
  flowId: 'a1000000-0000-4000-8000-000000000040',
  ruleId: 'a1000000-0000-4000-8000-000000000030',
  lossId: '217aff6d-a45c-456d-adb2-8b950fe5812a',
  recoveryId: 'f1ce0536-2bab-4cc1-a9ab-370dbf9bbfdb',
};

function concrete(pattern) {
  const values = {
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
  };
  return values[pattern] ?? pattern;
}

function expected(source, destination, concreteSource) {
  if (destination.includes(':provider')) {
    const provider = concreteSource.slice(concreteSource.lastIndexOf('/') + 1);
    return destination.replace(':provider', provider);
  }
  if (!destination.includes(':path*')) return destination;
  const sourcePrefix = source.slice(0, source.indexOf('/:path*'));
  const suffix = concreteSource.slice(sourcePrefix.length) || '/probe';
  return destination.replace(':path*', suffix.replace(/^\//, ''));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const loginPage = await context.newPage();
const results = [];
try {
  await loginPage.goto(new URL('/login', base).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await loginPage.waitForTimeout(700);
  await loginPage.locator('#login-email').fill(roleOwnerEmail);
  await loginPage.locator('#login-password').fill(password);
  await loginPage.getByRole('button', { name: 'Continue', exact: true }).click();
  await loginPage.waitForURL(/\/overview(?:\?|$)/, { timeout: 30_000 });
  await loginPage.close();

  for (const redirect of LEGACY_UI_REDIRECTS) {
    const concreteSource = concrete(redirect.source);
    const expectedPath = expected(redirect.source, redirect.destination, concreteSource);
    const requested = `${concreteSource}${concreteSource.includes('?') ? '&' : '?'}alias_probe=1`;
    let error = null;
    let finalUrl = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const page = await context.newPage();
      try {
        await page.goto(new URL(requested, base).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForTimeout(450);
        finalUrl = new URL(page.url());
        error = null;
        await page.close();
        break;
      } catch (cause) {
        error = `attempt ${attempt}: ${cause instanceof Error ? cause.message : String(cause)}`;
        finalUrl = new URL(page.url());
        await page.close().catch(() => {});
      }
    }
    if (!finalUrl) finalUrl = new URL(base);
    const expectedUrl = new URL(expectedPath, base);
    const pathPass = finalUrl.pathname === expectedUrl.pathname;
    // Redirect entries do not declare a query-drop policy. Next's canonical
    // redirect contract therefore preserves inbound query parameters for all
    // aliases, including help-topic compatibility links.
    const queryExpected = true;
    const queryPass = finalUrl.searchParams.get('alias_probe') === '1';
    results.push({
      source: redirect.source,
      requested,
      destination: redirect.destination,
      expectedPath: expectedUrl.pathname,
      finalPath: finalUrl.pathname,
      queryPreserved: queryPass,
      queryPolicy: queryExpected ? 'preserve' : 'normalized-no-declared-state',
      pathPass,
      verdict: !error && pathPass && queryPass,
      error,
    });
  }
} finally {
  await context.close();
  await browser.close();
}

const output = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  aliasCount: LEGACY_UI_REDIRECTS.length,
  rootRedirectIncluded: LEGACY_UI_REDIRECTS.some((entry) => entry.source === '/'),
  results,
  passed: results.filter((result) => result.verdict).length,
  total: results.length,
};
fs.writeFileSync(path.join(artifactDir, 'aliases.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ passed: output.passed, total: output.total, failures: results.filter((result) => !result.verdict) }, null, 2));
if (output.passed !== output.total) process.exitCode = 1;
