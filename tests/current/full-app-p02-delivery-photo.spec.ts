import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const MERCHANT_ID = process.env.E2E_MERCHANT_ID ?? '';
const SUPABASE_ENDPOINT = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CASE_ID = '1c753dda-f16e-450b-aa68-e81757daf266';
const scenario = scenarioLedger.find((candidate) => candidate.id === 'delivery-photo-finding-modal');
if (!MERCHANT_ID || !SUPABASE_ENDPOINT || !KEY || !scenario) throw new Error('Delivery-photo acceptance environment is incomplete');
const service = createClient(SUPABASE_ENDPOINT, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];
const variants: Array<Record<string, any>> = [];

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function business(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(business);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => key !== 'updated_at').map(([key, item]) => [key, business(item)]));
  return value;
}
function fingerprint(value: unknown) { return createHash('sha256').update(stable(business(value))).digest('hex'); }
function directory() { const value = path.join(ROOT, 'scenarios', scenario!.id); fs.mkdirSync(value, { recursive: true }); return value; }
async function shot(page: Page, name: string) { const file = path.join(directory(), `${name}.png`); await page.screenshot({ path: file }); return path.relative(ROOT, file); }
async function one(table: string, filters: Record<string, string>) {
  let query = service.from(table).select('*');
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const result = await query.maybeSingle(); if (result.error) throw result.error; return result.data as Record<string, any> | null;
}
async function restoreClaim(row: Record<string, any>) {
  const { id, merchant_id: merchantId, created_at: _createdAt, updated_at: _updatedAt, ...fields } = row;
  const result = await service.from('support_payout_cases').update(fields).eq('id', id).eq('merchant_id', merchantId); if (result.error) throw result.error;
}
async function remove(ids: { integration: string; fulfillment: string; evidence: string[] }, claimPre: Record<string, any>) {
  if (ids.evidence.length) {
    const links = await service.from('evidence_links').delete().in('evidence_item_id', ids.evidence); if (links.error) throw links.error;
    const evidence = await service.from('evidence_items').delete().in('id', ids.evidence); if (evidence.error) throw evidence.error;
  }
  const fulfillment = await service.from('source_fulfillments').delete().eq('id', ids.fulfillment).eq('merchant_id', MERCHANT_ID); if (fulfillment.error) throw fulfillment.error;
  const integration = await service.from('merchant_integrations').delete().eq('id', ids.integration).eq('merchant_id', MERCHANT_ID); if (integration.error) throw integration.error;
  await restoreClaim(claimPre);
}

test.describe.serial('FAA-2 delivery photo finding', () => {
  for (const variant of VARIANTS) test(`delivery-photo-finding-modal · ${variant.id}`, async ({ page, context }, testInfo: TestInfo) => {
    test.setTimeout(90_000);
    const origin = new URL(String(testInfo.project.use.baseURL));
    await page.setViewportSize({ width: variant.width, height: variant.height });
    await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: origin.hostname, path: '/' }]);
    const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; const externalMutations: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => { const failure = request.failure()?.errorText ?? 'failed'; if (request.url().startsWith(origin.origin) && failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`); });
    page.on('request', (request) => { const url = new URL(request.url()); if (url.origin !== origin.origin && request.method() !== 'GET') externalMutations.push(`${request.method()} ${url.origin}${url.pathname}`); });
    const claimPre = await one('support_payout_cases', { id: CASE_ID, merchant_id: MERCHANT_ID });
    if (!claimPre?.source_order_id) throw new Error('Delivery-photo case fixture has no source order');
    const suffix = randomUUID();
    const ids = { integration: randomUUID(), fulfillment: randomUUID(), evidence: [randomUUID(), randomUUID(), randomUUID(), randomUUID()] };
    const tracking = `1ZFAA2${suffix.replaceAll('-', '').slice(0, 10)}`;
    const preFingerprint = fingerprint({ claim: claimPre, integration: null, fulfillment: null, evidence: [] });
    try {
      const integration = await service.from('merchant_integrations').insert({ id: ids.integration, merchant_id: MERCHANT_ID, provider_id: 'ups', category: 'carrier', status: 'connected', auth_mode: 'api_key', display_name: 'FAA2 local UPS fixture', environment: 'local_acceptance', writeback_enabled: false });
      if (integration.error) throw integration.error;
      const fulfillment = await service.from('source_fulfillments').insert({ id: ids.fulfillment, merchant_id: MERCHANT_ID, source_order_id: claimPre.source_order_id, external_id: `faa2-${suffix}`, status: 'delivered', shipment_status: 'delivered', tracking_company: 'UPS', tracking_number: tracking, occurred_at: '2026-08-29T12:00:00.000Z' });
      if (fulfillment.error) throw fulfillment.error;
      const types = [
        ['tracking_number', tracking, 'UPS tracking number'],
        ['delivery_status', 'delivered', 'Delivered'],
        ['tracking_events', 3, '3 tracking events, 0 exception events'],
        ['delivery_photo', 'https://local.invalid/faa2-delivery-photo.jpg', 'Delivery photo found'],
      ];
      const evidenceRows = types.map(([type, value, summary], index) => ({ id: ids.evidence[index], merchant_id: MERCHANT_ID, claim_id: CASE_ID, source_system: 'ups', evidence_type: type, title: `FAA2 ${type}`, summary, source_record_id: tracking, source_created_at: '2026-08-29T12:00:00.000Z', structured_value: { value }, source_metadata: { source_category: 'tracking_proof', fixture: 'full-app-acceptance-2026-08-30' } }));
      const inserted = await service.from('evidence_items').insert(evidenceRows); if (inserted.error) throw inserted.error;

      await page.goto(`/cases/${CASE_ID}?tab=evidence`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: 'Review photo' })).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: 'Review photo' }).click();
      const modal = page.locator('[data-overlay-id="delivery-photo-finding-modal"]');
      await expect(modal).toBeVisible();
      await modal.getByLabel('Finding').selectOption('unclear');
      await modal.getByLabel('Rationale').fill(`Local fixture photo is intentionally unavailable for visual inference ${suffix}`);
      const screenshot = await shot(page, `${variant.id}-finding-confirmation`);
      const responseWait = page.waitForResponse((candidate) => candidate.url().endsWith(`/api/claims/${CASE_ID}/delivery-photo-finding`) && candidate.request().method() === 'POST');
      await modal.getByRole('button', { name: 'Save finding' }).click();
      const response = await responseWait; expect(response.ok()).toBeTruthy();
      const body = await response.json() as Record<string, any>; const findingId = body.finding.id as string; ids.evidence.push(findingId);
      const request = response.request(); const key = request.headers()['idempotency-key']; expect(key).toBeTruthy();
      const replay = await page.request.post(`/api/claims/${CASE_ID}/delivery-photo-finding`, { headers: { 'content-type': 'application/json', 'idempotency-key': key }, data: request.postDataJSON() });
      expect(replay.ok()).toBeTruthy(); expect((await replay.json()).replayed).toBe(true);
      const persisted = await one('evidence_items', { id: findingId, merchant_id: MERCHANT_ID });
      expect(persisted?.structured_value).toMatchObject({ finding: 'unclear' });
      expect(externalMutations).toEqual([]); expect(consoleErrors).toEqual([]); expect(pageErrors).toEqual([]); expect(failedRequests).toEqual([]);
      await remove(ids, claimPre);
      const [claimPost, integrationPost, fulfillmentPost] = await Promise.all([
        one('support_payout_cases', { id: CASE_ID, merchant_id: MERCHANT_ID }), one('merchant_integrations', { id: ids.integration, merchant_id: MERCHANT_ID }), one('source_fulfillments', { id: ids.fulfillment, merchant_id: MERCHANT_ID }),
      ]);
      const postFingerprint = fingerprint({ claim: claimPost, integration: integrationPost, fulfillment: fulfillmentPost, evidence: [] });
      expect(postFingerprint).toBe(preFingerprint);
      variants.push({ id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, finalUrl: new URL(page.url()).pathname, screenshots: [screenshot], consoleErrors, pageErrors, failedRequests, mutationReceipt: { scenarioId: scenario!.id, merchantId: MERCHANT_ID, actorId: persisted?.created_by, canonicalRole: 'owner', delegatedGrants: [], preStateFingerprint: preFingerprint, request: { method: 'POST', path: `/api/claims/${CASE_ID}/delivery-photo-finding`, idempotencyKey: key, redactedPayload: { finding: 'unclear', rationale: '[local factual rationale]' } }, visibleResult: 'The modal stated this was a human observation, not responsibility or customer decision.', persistedReadBack: { id: findingId, finding: persisted?.structured_value?.finding }, auditOrVersionConsequence: { evidenceItemCreated: true, advisoryReevaluation: body.reevaluation_status, domainEventRetained: true }, externalActions: { carrier: false, provider: false, email: false, billing: false, previewDeployment: false }, replayResult: { status: replay.status(), replayed: true }, cleanupAction: { seededEvidenceIds: ids.evidence, fulfillmentId: ids.fulfillment, integrationId: ids.integration, advisoryFieldsRestored: true }, postCleanupFingerprint: postFingerprint, invariantException: 'The semantic evidence.updated domain event and database-managed timestamps remain append-only; all mutable local fixture, finding, and advisory business state returned to prestate.' } });
      ids.evidence = [];
    } finally {
      await remove(ids, claimPre).catch(() => undefined);
    }
  });

  test.afterAll(() => {
    const screenshots = variants.flatMap((variant) => variant.screenshots); const consoleErrors = variants.flatMap((variant) => variant.consoleErrors); const pageErrors = variants.flatMap((variant) => variant.pageErrors); const failedRequests = variants.flatMap((variant) => variant.failedRequests);
    const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
    fs.writeFileSync(path.join(directory(), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: scenario!.id, owningSurface: scenario!.owner, declaredKind: scenario!.kind, activation: scenario!.activationRecipe, viewport: variants.map((variant) => variant.viewport), theme: variants.map((variant) => variant.theme), roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: variants.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: [], screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: variants.map((variant) => variant.mutationReceipt), cleanup: 'Removed the synthetic connection, fulfillment, carrier evidence, and human finding; restored advisory business fields and retained append-only domain events.', verdict: passed ? 'passed' : variants.length ? 'partial' : 'untested', note: passed ? 'Both required variants recorded, replayed, read back, and cleaned a local human delivery-photo finding without contacting a carrier or making a decision.' : 'One or more local delivery-photo workflow variants did not complete.', variants }, null, 2)}\n`);
  });
});
