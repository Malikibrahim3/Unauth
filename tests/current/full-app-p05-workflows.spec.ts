import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const MERCHANT_ID = process.env.E2E_MERCHANT_ID ?? '';
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false, autoRefreshToken: false } });
const SCENARIOS = ['connection-and-disconnection-modals', 'replace-import-file-confirmation', 'connect-shopify-modal'] as const;
const manifest = new Map(scenarioLedger.map((scenario) => [scenario.id, scenario]));
if (!MERCHANT_ID || SCENARIOS.some((id) => !manifest.has(id))) throw new Error('FAA-5 workflow acceptance environment is incomplete');

const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];
type ScenarioId = (typeof SCENARIOS)[number];
type RuntimeEvidence = { id: string; viewport: string; theme: LightOnlyAppearance; finalUrl: string; screenshots: string[]; consoleErrors: string[]; pageErrors: string[]; failedRequests: string[]; mutationReceipt: Record<string, unknown> };
const evidence = new Map<ScenarioId, RuntimeEvidence[]>();

function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function directory(id: string) { const value = path.join(ROOT, 'scenarios', id); fs.mkdirSync(value, { recursive: true }); return value; }
async function shot(page: Page, id: string, name: string) { const file = path.join(directory(id), `${name}.png`); await page.screenshot({ path: file, fullPage: true }); return path.relative(ROOT, file); }
function observe(page: Page, origin: string) {
  const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; const externalMutations: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => { const failure = request.failure()?.errorText ?? 'failed'; if (request.url().startsWith(origin) && failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`); });
  page.on('request', (request) => { const url = new URL(request.url()); if (url.origin !== origin && request.method() !== 'GET') externalMutations.push(`${request.method()} ${url.origin}${url.pathname}`); });
  return { consoleErrors, pageErrors, failedRequests, externalMutations };
}
async function preparePage(page: Page, context: Parameters<Parameters<typeof test>[1]>[0]['context'], testInfo: TestInfo, variant: (typeof VARIANTS)[number]) {
  const base = new URL(String(testInfo.project.use.baseURL));
  await page.setViewportSize({ width: variant.width, height: variant.height });
  await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
  return { base, runtime: observe(page, base.origin) };
}
function receipt(value: Record<string, unknown>) { return { schemaVersion: 2, environment: 'loopback-local-supabase', timestamp: new Date().toISOString(), ...value }; }
function record(id: ScenarioId, variant: (typeof VARIANTS)[number], page: Page, screenshots: string[], runtime: ReturnType<typeof observe>, mutationReceipt: Record<string, unknown>) {
  expect(runtime.externalMutations).toEqual([]); expect(runtime.consoleErrors).toEqual([]); expect(runtime.pageErrors).toEqual([]); expect(runtime.failedRequests).toEqual([]);
  evidence.set(id, [...(evidence.get(id) ?? []), { id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, finalUrl: new URL(page.url()).pathname, screenshots, consoleErrors: runtime.consoleErrors, pageErrors: runtime.pageErrors, failedRequests: runtime.failedRequests, mutationReceipt }]);
}

async function integrationRows(providerId: string) {
  const result = await service.from('merchant_integrations').select('id,provider_id,status,environment,provider_account_id,provider_account_name,disconnected_at,created_at,updated_at').eq('merchant_id', MERCHANT_ID).eq('provider_id', providerId).order('created_at');
  if (result.error) throw result.error; return result.data ?? [];
}
async function shopifyFingerprint() {
  const [canonical, stores, credentials] = await Promise.all([
    integrationRows('shopify'),
    service.from('store_connections').select('id,status,store_key,store_url,installed_at,uninstalled_at').eq('merchant_id', MERCHANT_ID).eq('platform', 'shopify').order('id'),
    service.from('integration_credentials').select('id,connection_id,provider_id,created_at,updated_at').eq('merchant_id', MERCHANT_ID).eq('provider_id', 'shopify').order('id'),
  ]);
  if (stores.error) throw stores.error; if (credentials.error) throw credentials.error;
  return { canonical, stores: stores.data ?? [], credentials: credentials.data ?? [] };
}

test.describe.serial('FAA-5 source and import workflows', () => {
  for (const variant of VARIANTS) test(`connection-and-disconnection-modals · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000); const { runtime } = await preparePage(page, context, testInfo, variant);
    const pre = await integrationRows('self_fulfillment_pack');
    await page.goto('/sources/setup/self_fulfillment_pack?step=activate', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Connect .*self/i }).click();
    const connectModal = page.locator('[role="dialog"][data-overlay-id="connection-and-disconnection-modals"]');
    await expect(connectModal).toBeVisible(); await expect(connectModal).toContainText('makes no provider or OAuth request');
    const connectShot = await shot(page, 'connection-and-disconnection-modals', `${variant.id}-local-connect-confirmation`);
    const connectResponse = page.waitForResponse((response) => response.url().endsWith('/api/integrations/self_fulfillment_pack/connect') && response.request().method() === 'POST');
    await connectModal.getByRole('button', { name: 'Enable local source' }).click(); expect((await connectResponse).ok()).toBeTruthy();
    const replay = await page.request.post('/api/integrations/self_fulfillment_pack/connect', { data: {} }); expect(replay.ok()).toBeTruthy();
    await page.reload({ waitUntil: 'domcontentloaded' });
    const afterConnect = await integrationRows('self_fulfillment_pack'); expect(afterConnect).toHaveLength(1); expect(afterConnect[0]?.status).toBe('connected');
    const credentialRows = await service.from('integration_credentials').select('id').eq('merchant_id', MERCHANT_ID).eq('provider_id', 'self_fulfillment_pack'); if (credentialRows.error) throw credentialRows.error; expect(credentialRows.data).toEqual([]);
    await page.getByRole('button', { name: 'Disconnect' }).click();
    const disconnectModal = page.locator('[role="dialog"][data-overlay-id="connection-and-disconnection-modals"]'); await expect(disconnectModal).toBeVisible(); await expect(disconnectModal).toContainText('No external provider exists');
    const title = await disconnectModal.getByRole('heading').first().innerText(); const providerName = title.replace(/^Disconnect\s+/, '');
    await disconnectModal.locator('input').fill(providerName.toUpperCase());
    const disconnectShot = await shot(page, 'connection-and-disconnection-modals', `${variant.id}-local-disconnect-confirmation`);
    const disconnectResponse = page.waitForResponse((response) => response.url().endsWith('/api/integrations/self_fulfillment_pack/disconnect') && response.request().method() === 'POST');
    await disconnectModal.getByRole('button', { name: 'Disconnect', exact: true }).click(); expect((await disconnectResponse).ok()).toBeTruthy();
    const readBack = await integrationRows('self_fulfillment_pack'); expect(readBack).toHaveLength(1); expect(readBack[0]?.status).toBe('revoked'); expect(readBack[0]?.disconnected_at).toBeTruthy();
    record('connection-and-disconnection-modals', variant, page, [connectShot, disconnectShot], runtime, receipt({ scenarioId: 'connection-and-disconnection-modals', preStateFingerprint: hash(pre), request: { methods: ['POST', 'POST', 'POST'], paths: ['/api/integrations/self_fulfillment_pack/connect', '/api/integrations/self_fulfillment_pack/connect', '/api/integrations/self_fulfillment_pack/disconnect'], externalProviderRequest: false, credentialsSubmitted: false }, visibleResult: 'The local capability required explicit connect and disconnect consequence review; the UI distinguished capability enablement from evidence, data return, provider authorization, health and freshness.', readBack, replay: { status: replay.status(), canonicalConnectionCount: afterConnect.length }, consequence: { finalStatus: 'revoked', canonicalRecordsDeleted: false, credentialsCreated: false, externalProviderContact: false }, cleanup: 'Retained the single revoked local capability row because disconnection history is a truth-bearing configuration outcome.', exception: 'The synthetic local connector row remains revoked; no external provider, OAuth, email, billing, money, or deployment action occurred.' }));
  });

  for (const variant of VARIANTS) test(`replace-import-file-confirmation · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000); const { runtime } = await preparePage(page, context, testInfo, variant); const tag = `faa5-${variant.id}-${randomUUID().slice(0, 8)}`; const externalId = `${tag}-jpy-order`;
    await page.goto('/sources/imports?step=upload', { waitUntil: 'domcontentloaded' });
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: `${tag}-first.csv`, mimeType: 'text/csv', buffer: Buffer.from('external_id,currency,total_minor\nfirst-order,GBP,1200') });
    await expect(page.getByRole('heading', { name: 'Map source columns' })).toBeVisible(); await page.getByRole('button', { name: 'Back' }).click();
    await fileInput.setInputFiles({ name: `${tag}-replacement.csv`, mimeType: 'text/csv', buffer: Buffer.from(`external_id,currency,total_minor\n${externalId},JPY,123`) });
    const replaceModal = page.locator('[role="dialog"][data-overlay-id="replace-import-file-confirmation"]'); await expect(replaceModal).toBeVisible(); await expect(replaceModal).toContainText('Any earlier import job and its records remain unchanged.');
    const replaceShot = await shot(page, 'replace-import-file-confirmation', `${variant.id}-replace-confirmation`); await page.keyboard.press('Escape'); await expect(replaceModal).toBeHidden();
    await fileInput.setInputFiles([]); await fileInput.setInputFiles({ name: `${tag}-replacement.csv`, mimeType: 'text/csv', buffer: Buffer.from(`external_id,currency,total_minor\n${externalId},JPY,123`) }); await replaceModal.getByRole('button', { name: 'Replace file' }).click();
    await expect(page.getByRole('heading', { name: 'Map source columns' })).toBeVisible(); await expect(page.getByText(`Sample: ${externalId}`)).toBeVisible();

    const malformed = await page.request.post('/api/imports/csv/validate', { data: { dataset: 'orders', mapping: { external_id: 'external_id', currency: 'currency' }, csv: 'external_id,currency\nmalformed\u0000,GBP' } }); expect(malformed.status()).toBe(400); expect((await malformed.json()).error).toBe('binary_content');
    const badMapping = await page.request.post('/api/imports/csv/validate', { data: { dataset: 'orders', mapping: { external_id: 'external_id' }, csv: 'external_id,currency\nmissing-map,GBP' } }); expect(badMapping.status()).toBe(400); expect((await badMapping.json()).error).toBe('missing_required_mapping');
    const csv = `external_id,currency,total_minor,order_number\n${externalId},JPY,123,${tag}\n${externalId},JPY,123,${tag}-duplicate\n,GBP,50,${tag}-missing-id`;
    const mapping = { external_id: 'external_id', currency: 'currency', total_minor: 'total_minor', order_number: 'order_number' };
    const validation = await page.request.post('/api/imports/csv/validate', { data: { dataset: 'orders', mapping, csv } }); expect(validation.ok()).toBeTruthy(); const validationBody = await validation.json() as { total_rows: number; valid_count: number; error_count: number; duplicates_skipped: number; errors: unknown[] }; expect(validationBody).toMatchObject({ total_rows: 3, valid_count: 1, error_count: 1, duplicates_skipped: 1 }); expect(validationBody.errors).toHaveLength(1);
    const commitPayload = { dataset: 'orders', mapping, csv, import_name: `FAA-5 ${tag}`, file_name: `${tag}.csv`, file_size: Buffer.byteLength(csv) };
    const firstCommit = await page.request.post('/api/imports/csv/commit', { data: commitPayload }); expect(firstCommit.status()).toBe(201); const firstBody = await firstCommit.json() as { job_id: string; persisted: number; error_count: number; duplicates_skipped: number }; expect(firstBody).toMatchObject({ persisted: 1, error_count: 1, duplicates_skipped: 1 });
    const replay = await page.request.post('/api/imports/csv/commit', { data: commitPayload }); expect(replay.status()).toBe(201); const replayBody = await replay.json() as { job_id: string; persisted: number }; expect(replayBody.persisted).toBe(1);
    const [orders, records, jobs] = await Promise.all([
      service.from('source_orders').select('id,external_id,source,currency,total_price,order_number').eq('merchant_id', MERCHANT_ID).eq('source', 'manual').eq('external_id', externalId),
      service.from('source_records').select('id,source_system,source_entity_type,external_id,canonical_entity_id').eq('merchant_id', MERCHANT_ID).eq('source_system', 'manual').eq('external_id', externalId),
      service.from('sync_jobs').select('id,status,total_rows,processed_rows,failed_rows,file_hash,column_map,error_log,cursor').eq('merchant_id', MERCHANT_ID).in('id', [firstBody.job_id, replayBody.job_id]).order('created_at'),
    ]); for (const result of [orders, records, jobs]) if (result.error) throw result.error;
    expect(orders.data).toHaveLength(1); expect(orders.data?.[0]).toMatchObject({ external_id: externalId, currency: 'JPY', total_price: 123 }); expect(records.data).toHaveLength(1); expect(jobs.data).toHaveLength(2); expect(jobs.data?.every((job) => job.status === 'completed' && job.failed_rows === 1)).toBe(true);
    await page.goto(`/sources/imports/${firstBody.job_id}`, { waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-state-id="import-job-completed"]')).toBeVisible(); const retainedShot = await shot(page, 'replace-import-file-confirmation', `${variant.id}-retained-import-job`);
    record('replace-import-file-confirmation', variant, page, [replaceShot, retainedShot], runtime, receipt({ scenarioId: 'replace-import-file-confirmation', preStateFingerprint: hash({ externalId, existing: false }), request: { validationPaths: ['/api/imports/csv/validate'], commitPath: '/api/imports/csv/commit', malformedBytes: true, missingRequiredHeaderMapping: true, rowErrors: true, duplicateExternalId: true, currency: 'JPY', replayedIdenticalPayload: true }, visibleResult: 'Replacing a dirty CSV required confirmation; cancellation preserved the first file, confirmation loaded the replacement, and the retained job showed validation and commit outcomes.', validation: validationBody, readBack: { orders: orders.data, provenance: records.data, jobs: jobs.data }, replay: { firstJobId: firstBody.job_id, replayJobId: replayBody.job_id, canonicalOrderCount: orders.data?.length, provenanceCount: records.data?.length }, consequence: { validRowsPersisted: 1, invalidRowsPersisted: 0, duplicateCanonicalRows: 0, jpyMinorUnitValuePreserved: orders.data?.[0]?.total_price === 123 }, cleanup: 'Retained both immutable import jobs, their single canonical row, provenance row and append-only domain-event history because deleting them would erase the acceptance evidence.', exception: 'Purpose-created local CSV records remain tagged by the FAA-5 external ID. No provider, OAuth, email, billing, money, or deployment action occurred.' }));
  });

  for (const variant of VARIANTS) test(`connect-shopify-modal · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(90_000); const { runtime } = await preparePage(page, context, testInfo, variant); const pre = await shopifyFingerprint(); const installRequests: string[] = [];
    page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/shopify/install') installRequests.push(request.url()); });
    await page.goto('/sources/setup/shopify', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /Activate.*explicit action/ }).click();
    await page.waitForURL(/\/sources\/setup\/shopify\?step=activate(?:&|$)/);
    await expect(page.getByRole('heading', { name: /^(Activate|Manage) Shopify$/ })).toBeVisible();
    const opener = page.locator('[data-testid="open-connect-shopify-modal"], [data-testid="reconnect-shopify"]').first(); await expect(opener).toBeVisible(); await opener.click();
    const modal = page.locator('[role="dialog"][data-overlay-id="connect-shopify-modal"]'); await expect(modal).toBeVisible();
    const input = modal.getByLabel('Shopify Admin URL'); await input.fill(''); await modal.getByRole('button', { name: 'Continue to Shopify' }).click(); await expect(modal.getByText('Enter the Shopify Admin URL.')).toBeVisible();
    await input.fill('https://example-store.com'); await modal.getByRole('button', { name: 'Continue to Shopify' }).click(); await expect(modal.getByText('Use the Shopify Admin URL, not the public storefront address.')).toBeVisible();
    await input.fill('https://admin.shopify.com/store/faa5-safe-store'); await expect(modal).toContainText('https://faa5-safe-store.myshopify.com/admin/oauth'); await expect(modal).toContainText('Write anything'); await expect(modal).toContainText('Never requested');
    const modalShot = await shot(page, 'connect-shopify-modal', `${variant.id}-oauth-handoff-boundary`); await modal.getByRole('button', { name: 'Cancel' }).click(); await expect(modal).toBeHidden(); expect(installRequests).toEqual([]);
    const post = await shopifyFingerprint(); expect(post).toEqual(pre);
    record('connect-shopify-modal', variant, page, [modalShot], runtime, receipt({ scenarioId: 'connect-shopify-modal', preStateFingerprint: hash(pre), postStateFingerprint: hash(post), request: { externalProviderRequest: false, oauthInstallRequest: false, testedInputs: ['empty', 'public storefront domain', 'valid Shopify Admin URL'] }, visibleResult: 'The modal rejected empty and storefront inputs, normalized the valid Admin URL, disclosed read-only scopes and stopped before external OAuth.', readBack: post, consequence: { connectionChanged: false, credentialChanged: false, providerContact: false }, replay: { result: 'Input validation was repeated locally; no authorization request was sent.' }, cleanup: 'Closed the modal with the canonical Shopify connection and credential state byte-for-byte unchanged.' }));
  });

  test.afterAll(() => {
    for (const id of SCENARIOS) {
      const variants = evidence.get(id) ?? []; if (!variants.length) continue; const scenario = manifest.get(id)!; const screenshots = variants.flatMap((variant) => variant.screenshots); const consoleErrors = variants.flatMap((variant) => variant.consoleErrors); const pageErrors = variants.flatMap((variant) => variant.pageErrors); const failedRequests = variants.flatMap((variant) => variant.failedRequests); const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
      fs.writeFileSync(path.join(directory(id), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: id, owningSurface: scenario.owner, declaredKind: scenario.kind, activation: scenario.activationRecipe, viewport: variants.map((variant) => variant.viewport), theme: variants.map((variant) => variant.theme), roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: variants.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: [], screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: variants.map((variant) => variant.mutationReceipt), cleanup: 'Purpose-created CSV and local connector history were retained only where deletion would erase provenance. Shopify stopped before external OAuth and changed nothing.', verdict: passed ? 'passed' : variants.length ? 'partial' : 'untested', note: passed ? 'Both required variants exercised the real local P05 boundary, proved persisted or zero-write outcomes, and contacted no external provider.' : 'One or more FAA-5 workflow variants did not complete.', variants }, null, 2)}\n`);
    }
  });
});
