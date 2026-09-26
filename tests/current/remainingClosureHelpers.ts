import fs from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';
import { scenarioLedger } from '@/lib/surfaces/manifest';

const requestedRoot = process.env.UNAUTH_REMAINING_CLOSURE_ROOT?.trim();
if (requestedRoot && !/^artifacts\/merchant-clarity-implementation\/2026-09-09-ui-forensics-01\/P12\/ui-forensics\/continuations\/[0-9TZ-]+\/remaining-fixture$/.test(requestedRoot)) throw new Error('Select a dated forensic fixture root under the audit continuation directory.');
export const REMAINING_ROOT = path.resolve(process.cwd(), requestedRoot || 'artifacts/full-app-acceptance-remaining-2026-08-31');
export const REMAINING_FIXTURE = 'full-app-acceptance-remaining-2026-08-31';
export const SCENARIO_HEADER = 'x-unauth-acceptance-scenario';
const CANONICAL_BUILD_RECEIPT = path.join(
  process.cwd(),
  'artifacts',
  'full-app-acceptance-2026-08-30',
  'build-environment.json',
);

type Marker = { fixture: string; kind: string; runId: string; localOnly: boolean };
export type RemainingFixture = {
  kind: string;
  merchantId: string;
  name?: string;
  subjectId?: string;
  owner: { email: string };
  secondMember?: { email: string };
  marker: Marker;
};
export type RemainingFixturePlan = {
  fixture: string;
  runId: string;
  state?: string;
  fixtures: Record<'settings' | 'privacy' | 'workspaceDeletion', RemainingFixture>;
};
type MutationState = {
  fixture: string;
  runId: string;
  storageObjects: Array<{ bucket: string; path: string }>;
  invitedAuthUsers: Array<{ id: string; email: string; merchantId: string; memberId: string }>;
};

function isLoopback(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function requireRemainingClosurePlan(): RemainingFixturePlan {
  const vercel = process.env.VERCEL_ENV?.toLowerCase();
  if (process.env.RELEASE_E2E_LOCAL !== '1' || vercel === 'preview' || vercel === 'production') {
    throw new Error('Remaining-closure browser tests require RELEASE_E2E_LOCAL=1 outside preview and production.');
  }
  if (!isLoopback(process.env.NEXT_PUBLIC_APP_URL) || !isLoopback(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    throw new Error('Remaining-closure browser tests require configured loopback app and Supabase URLs.');
  }

  const planPath = path.join(REMAINING_ROOT, 'fixture-plan.json');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as RemainingFixturePlan;
  if (plan.fixture !== REMAINING_FIXTURE || plan.state !== 'prepared') {
    throw new Error('Remaining-closure fixture plan is missing or not prepared.');
  }
  for (const kind of ['settings', 'privacy', 'workspaceDeletion'] as const) {
    const fixture = plan.fixtures?.[kind];
    if (!fixture || fixture.kind !== kind || !fixture.merchantId || fixture.marker?.fixture !== REMAINING_FIXTURE || fixture.marker.runId !== plan.runId) {
      throw new Error(`Remaining-closure fixture ${kind} is invalid.`);
    }
  }
  return plan;
}

export async function authenticateFixture(page: Page, baseURL: string, fixture: RemainingFixture, redirect: string): Promise<void> {
  const secret = process.env.E2E_AUTH_SECRET;
  if (!secret) throw new Error('Remaining-closure browser tests require E2E_AUTH_SECRET.');
  const auth = new URL('/api/test/e2e-auth', baseURL);
  auth.searchParams.set('secret', secret);
  auth.searchParams.set('merchant_id', fixture.merchantId);
  auth.searchParams.set('redirect', redirect);
  await page.goto(auth.toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 });
  if (new URL(page.url()).pathname !== new URL(redirect, baseURL).pathname) {
    throw new Error('Fixture authentication did not reach its expected local redirect.');
  }
}

export async function setLightOnlyAppearance(
  context: BrowserContext,
  baseURL: string,
  theme: LightOnlyAppearance,
): Promise<void> {
  const base = new URL(baseURL);
  await context.addCookies([{
    name: LEGACY_DARK_COOKIE,
    value: theme,
    domain: base.hostname,
    path: '/',
  }]);
}

export function scenarioDirectory(scenarioId: string): string {
  const directory = path.join(REMAINING_ROOT, 'scenarios', scenarioId);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

export async function captureScenario(page: Page, scenarioId: string, fileName: string): Promise<string> {
  const filePath = path.join(scenarioDirectory(scenarioId), fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  return path.relative(REMAINING_ROOT, filePath);
}

export function writeScenarioReceipt(scenarioId: string, receipt: Record<string, unknown>): void {
  if (!fs.existsSync(CANONICAL_BUILD_RECEIPT)) {
    throw new Error('Remaining-closure evidence requires the canonical acceptance build receipt.');
  }
  const build = JSON.parse(fs.readFileSync(CANONICAL_BUILD_RECEIPT, 'utf8')) as {
    status?: string;
    buildId?: string | null;
    dirtyTreeFingerprint?: string | null;
  };
  if (build.status !== 'passed' || !build.buildId || !build.dirtyTreeFingerprint) {
    throw new Error('Canonical acceptance build receipt is incomplete or did not pass.');
  }
  const scenario = scenarioLedger.find((entry) => entry.id === scenarioId);
  const screenshots: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collect(item));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      if (entryKey === 'screenshot' && typeof entryValue === 'string') screenshots.push(entryValue);
      else if (entryKey === 'consoleErrors' && Array.isArray(entryValue)) consoleErrors.push(...entryValue.filter((item): item is string => typeof item === 'string'));
      else if (entryKey === 'pageErrors' && Array.isArray(entryValue)) pageErrors.push(...entryValue.filter((item): item is string => typeof item === 'string'));
      else if (entryKey === 'failedRequests' && Array.isArray(entryValue)) failedRequests.push(...entryValue.filter((item): item is string => typeof item === 'string'));
      else collect(entryValue);
    }
  };
  collect(receipt);
  const variants = Array.isArray(receipt.variants) ? receipt.variants as Array<Record<string, unknown>> : [];
  const defaultViewport = variants.flatMap((variant) => typeof variant.viewport === 'string' ? [variant.viewport] : []);
  const defaultTheme = variants.flatMap((variant) => typeof variant.theme === 'string' ? [variant.theme] : []);
  const enriched = {
    ...receipt,
    buildId: build.buildId,
    dirtyTreeFingerprint: build.dirtyTreeFingerprint,
    declaredKind: receipt.declaredKind ?? scenario?.kind ?? null,
    activation: receipt.activation ?? scenario?.activationRecipe ?? null,
    viewport: receipt.viewport ?? defaultViewport,
    theme: receipt.theme ?? defaultTheme,
    roleProfile: receipt.roleProfile ?? { role: 'owner', persona: null, delegatedPermissions: [] },
    finalUrl: receipt.finalUrl ?? null,
    consoleErrors: receipt.consoleErrors ?? consoleErrors,
    pageErrors: receipt.pageErrors ?? pageErrors,
    failedRequests: receipt.failedRequests ?? failedRequests,
    screenshotOrTrace: receipt.screenshotOrTrace ?? screenshots[0] ?? null,
    supportingEvidence: receipt.supportingEvidence ?? [...new Set(screenshots)],
    mutationReceipt: receipt.mutationReceipt ?? receipt.mutation ?? receipt.mutations ?? null,
  };
  fs.writeFileSync(
    path.join(scenarioDirectory(scenarioId), 'receipt.json'),
    `${JSON.stringify(enriched, null, 2)}\n`,
    { mode: 0o600 },
  );
}

export function runtimeObserver(page: Page, baseURL: string) {
  const base = new URL(baseURL).origin;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'failed';
    if (request.url().startsWith(base) && reason !== 'net::ERR_ABORTED') {
      failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${reason}`);
    }
  });
  return { consoleErrors, pageErrors, failedRequests };
}

export function mutationState(plan: RemainingFixturePlan): MutationState {
  const statePath = path.join(REMAINING_ROOT, 'mutation-state.json');
  if (!fs.existsSync(statePath)) return { fixture: REMAINING_FIXTURE, runId: plan.runId, storageObjects: [], invitedAuthUsers: [] };
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Partial<MutationState>;
  if (state.fixture !== REMAINING_FIXTURE || state.runId !== plan.runId || !Array.isArray(state.storageObjects)) {
    throw new Error('Remaining-closure mutation state belongs to a different fixture plan.');
  }
  return {
    fixture: state.fixture,
    runId: state.runId,
    storageObjects: state.storageObjects,
    invitedAuthUsers: Array.isArray(state.invitedAuthUsers) ? state.invitedAuthUsers : [],
  };
}

export function registerInvitedAuthUser(plan: RemainingFixturePlan, user: { id: string; email: string; merchantId: string; memberId: string }): void {
  if (user.merchantId !== plan.fixtures.settings.merchantId || !user.email.endsWith('@example.invalid')) {
    throw new Error('Only an exact Settings-fixture .invalid invite may be registered for cleanup.');
  }
  const state = mutationState(plan);
  if (!state.invitedAuthUsers.some((entry) => entry.id === user.id)) {
    state.invitedAuthUsers.push(user);
    fs.writeFileSync(path.join(REMAINING_ROOT, 'mutation-state.json'), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  }
}

export function localServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isLoopback(url) || !serviceRole) {
    throw new Error('Direct fixture read-back requires local Supabase and its local service-role credential.');
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export function registerExactStorageObject(plan: RemainingFixturePlan, object: { bucket: string; path: string }): void {
  if (object.bucket !== 'integration-documents' || !object.path.startsWith(`${plan.fixtures.settings.merchantId}/`)) {
    throw new Error('Only an exact Settings-fixture integration document may be registered for cleanup.');
  }
  const state = mutationState(plan);
  if (!state.storageObjects.some((entry) => entry.bucket === object.bucket && entry.path === object.path)) {
    state.storageObjects.push(object);
    fs.writeFileSync(path.join(REMAINING_ROOT, 'mutation-state.json'), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  }
}
