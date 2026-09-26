import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import {
  ACCEPTANCE_MERCHANT_ID,
  ACCEPTANCE_ROOT,
  assertLoopbackUrl,
  localSupabaseEnvironment,
  requireRolePassword,
} from './acceptance/local-runtime.mjs';

if (process.env.RELEASE_E2E_LOCAL !== '1') throw new Error('Set RELEASE_E2E_LOCAL=1 to acknowledge this local-only role pass');
const password = requireRolePassword();
const baseUrl = process.env.ROLE_ACCEPTANCE_BASE_URL?.trim() || 'http://127.0.0.1:3016';
assertLoopbackUrl(baseUrl, 'Role browser base URL');
const artifactRoot = path.join(process.cwd(), ACCEPTANCE_ROOT);
const artifactDir = path.join(artifactRoot, 'physical');
const fixturePath = path.join(artifactRoot, 'role-fixture.json');
if (!fs.existsSync(fixturePath)) throw new Error(`Missing role fixture receipt ${fixturePath}`);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
if (fixture.merchantId !== ACCEPTANCE_MERCHANT_ID || !Array.isArray(fixture.accounts)) throw new Error('Role fixture receipt is not the guarded acceptance fixture');
const { apiUrl, serviceRole } = localSupabaseEnvironment();
const service = createClient(apiUrl, serviceRole, { auth: { persistSession: false } });
fs.mkdirSync(artifactDir, { recursive: true });

function expectations(account) {
  const delegated = new Set(account.delegatedPermissions ?? []);
  return {
    settings: account.role === 'owner' || account.role === 'admin' || delegated.has('view_settings'),
    team: account.role === 'owner' || account.role === 'admin' || delegated.has('view_team'),
    decision: ['owner', 'admin', 'analyst'].includes(account.role) || delegated.has('submit_payout_decisions'),
  };
}

async function denialCount(since) {
  const query = await service.from('access_audit_log').select('id', { count: 'exact', head: true })
    .eq('merchant_id', ACCEPTANCE_MERCHANT_ID).eq('query_type', 'permission_denied').eq('lookup_type', 'view_team').gte('created_at', since);
  if (query.error) throw query.error;
  return query.count ?? 0;
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const account of fixture.accounts) {
    const expected = expectations(account);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const failedRequests = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'failed' }));
    const result = { id: account.id, persona: account.persona, role: account.role, delegatedPermissions: account.delegatedPermissions, email: account.email, expected, pages: {}, pageErrors, consoleErrors, failedRequests };
    try {
      await page.goto(new URL('/login', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.locator('#login-email').fill(account.email);
      await page.locator('#login-password').fill(password);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForURL(/\/overview(?:\?|$)/, { timeout: 30_000 });
      await page.getByRole('heading', { name: 'Operating position' }).waitFor({ state: 'visible', timeout: 30_000 });
      const overviewText = await page.locator('body').innerText();
      result.identityRendered = overviewText.split(/\n/).some((line) => line.trim() === account.role);
      result.settingsNavigationVisible = await page.locator('aside[aria-label="Workspace navigation"] a[href="/settings/workspace/account"]').count() > 0;
      await page.screenshot({ path: path.join(artifactDir, `role-${account.id}-overview.png`), fullPage: true });

      const denialStartedAt = new Date().toISOString();
      const denialBefore = await denialCount(denialStartedAt);
      const apiStatus = await page.evaluate(async () => (await fetch('/api/team', { headers: { Accept: 'application/json' } })).status);
      await page.waitForTimeout(150);
      const denialAfter = await denialCount(denialStartedAt);
      result.api = {
        route: 'GET /api/team',
        requiredPermission: 'view_team',
        status: apiStatus,
        allowed: apiStatus === 200,
        persistedAuditDenial: expected.team ? denialAfter === denialBefore : denialAfter > denialBefore,
      };

      await page.goto(new URL('/settings/workspace/account', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.getByRole('heading', { name: 'Account', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
      const accountText = await page.locator('body').innerText();
      result.pages.account = { url: page.url(), readOnly: /Workspace profile is read-only for your role/i.test(accountText), settingsManageCopy: /Workspace profile: owner or administrator/i.test(accountText) };

      await page.goto(new URL('/settings/workspace/team', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.getByRole('heading', { name: 'Team', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(1_500);
      const teamText = await page.locator('body').innerText();
      const invite = page.getByRole('button', { name: 'Invite member', exact: true });
      result.pages.team = {
        url: page.url(),
        accessDenied: /Forbidden|View-only access|cannot invite/i.test(teamText),
        inviteVisible: await invite.count() > 0 && await invite.isVisible().catch(() => false),
        inviteEnabled: await invite.count() > 0 && await invite.isEnabled().catch(() => false),
      };

      await page.goto(new URL('/cases', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.getByRole('heading', { name: 'Cases' }).waitFor({ state: 'visible', timeout: 30_000 });
      const nextHref = await page.getByRole('link', { name: 'Review next case' }).getAttribute('href');
      if (nextHref) {
        const selectedCaseId = new URL(nextHref, baseUrl).searchParams.get('selected');
        if (selectedCaseId) await page.goto(new URL(`/cases/${selectedCaseId}`, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.getByRole('heading', { name: /Decision evidence|Evidence and readiness/i }).waitFor({ state: 'visible', timeout: 30_000 });
      }
      result.pages.cases = {
        url: page.url(),
        previewVisible: Boolean(nextHref),
        decisionActionVisible: await page.getByRole('button', { name: 'Review merchant decision', exact: true }).count() > 0
          && await page.getByRole('button', { name: 'Review merchant decision', exact: true }).isEnabled().catch(() => false),
      };

      result.verdict = Boolean(
        result.identityRendered
        && result.settingsNavigationVisible === expected.settings
        && result.api.allowed === expected.team
        && result.api.persistedAuditDenial
        && result.pages.team.accessDenied === !expected.team
        && result.pages.team.inviteEnabled === (account.role === 'owner' || account.role === 'admin')
        && result.pages.cases.previewVisible
        && result.pages.cases.decisionActionVisible === expected.decision
        && pageErrors.length === 0,
      );
    } catch (error) {
      result.verdict = false;
      result.error = error instanceof Error ? error.message : String(error);
    } finally {
      results.push(result);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const output = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewport: { width: 1440, height: 900 },
  canonicalRoles: results.filter((result) => !result.persona),
  permissionProfiles: results.filter((result) => result.persona),
  passed: results.filter((result) => result.verdict).length,
  total: results.length,
};
fs.writeFileSync(path.join(artifactDir, 'roles.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ passed: output.passed, total: output.total, identities: results.map(({ id, role, persona, verdict, error }) => ({ id, role, persona, verdict, error })) }, null, 2));
if (output.passed !== output.total) process.exitCode = 1;
