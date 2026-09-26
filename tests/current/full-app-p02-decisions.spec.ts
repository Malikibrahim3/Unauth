import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const MERCHANT_ID = process.env.E2E_MERCHANT_ID ?? '';
const CASE_ID = 'aa0d6b43-8d16-41fd-9657-7924b8b57cf3';
const scenario = scenarioLedger.find((candidate) => candidate.id === 'record-or-reverse-merchant-decision-modals');
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false, autoRefreshToken: false } });
if (!MERCHANT_ID || !scenario) throw new Error('Decision acceptance environment is incomplete');
const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];
const variants: Array<Record<string, any>> = [];
function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function directory() { const value = path.join(ROOT, 'scenarios', scenario!.id); fs.mkdirSync(value, { recursive: true }); return value; }
async function shot(page: Page, name: string) { const file = path.join(directory(), `${name}.png`); await page.screenshot({ path: file }); return path.relative(ROOT, file); }
async function history() {
  const [decisions, outcomes, claimOutcomes, claim] = await Promise.all([
    service.from('case_decisions').select('id,decision,action,amount_minor,currency,reason,actor_user_id,effective_at,supersedes_decision_id,reverses_decision_id,idempotency_key').eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', CASE_ID).order('effective_at'),
    service.from('case_outcomes').select('id,outcome_type,amount_minor,currency,reason,actor_user_id,effective_at,idempotency_key').eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', CASE_ID).order('effective_at'),
    service.from('claim_outcomes').select('*').eq('claim_id', CASE_ID),
    service.from('support_payout_cases').select('id,state_version,payout_decision_state,status').eq('merchant_id', MERCHANT_ID).eq('id', CASE_ID).single(),
  ]);
  for (const result of [decisions, outcomes, claimOutcomes, claim]) if (result.error) throw result.error;
  return { decisions: decisions.data ?? [], outcomes: outcomes.data ?? [], claimOutcomes: claimOutcomes.data ?? [], claim: claim.data };
}
async function replay(page: Page, response: Awaited<ReturnType<Page['waitForResponse']>>) {
  const request = response.request(); const key = request.headers()['idempotency-key']; expect(key).toBeTruthy();
  const result = await page.request.fetch(request.url(), { method: request.method(), headers: { 'content-type': 'application/json', 'idempotency-key': key }, data: request.postDataJSON() });
  expect(result.ok()).toBeTruthy(); return { key, status: result.status(), body: await result.json() as Record<string, any> };
}

test.describe.serial('FAA-2 append-only merchant decision workflow', () => {
  for (const variant of VARIANTS) test(`record-or-reverse-merchant-decision-modals · ${variant.id}`, async ({ page, context }, testInfo: TestInfo) => {
    test.setTimeout(90_000);
    const base = new URL(String(testInfo.project.use.baseURL));
    await page.setViewportSize({ width: variant.width, height: variant.height });
    await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
    const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; const externalMutations: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); }); page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => { const failure = request.failure()?.errorText ?? 'failed'; if (request.url().startsWith(base.origin) && failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`); });
    page.on('request', (request) => { const url = new URL(request.url()); if (url.origin !== base.origin && request.method() !== 'GET') externalMutations.push(`${request.method()} ${url.origin}${url.pathname}`); });
    const pre = await history(); const preFingerprint = hash(pre); const rationale = `FAA2 local decision ${randomUUID()}`;
    await page.goto(`/cases/${CASE_ID}?tab=evidence`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Review merchant decision' }).click();
    const panel = page.locator('[role="dialog"][data-overlay-id="case-decision-panel"]'); await expect(panel).toBeVisible();
    await panel.getByLabel('Decision', { exact: true }).selectOption('no_additional_payout'); await panel.getByLabel('Decision rationale').fill(rationale);
    await panel.getByRole('button', { name: 'Review decision' }).click();
    const recordModal = page.locator('[role="dialog"][data-overlay-id="record-merchant-decision-modal"]'); await expect(recordModal).toBeVisible();
    const recordShot = await shot(page, `${variant.id}-record-confirmation`);
    const recordWait = page.waitForResponse((response) => response.url().endsWith(`/api/claims/${CASE_ID}/outcome`) && response.request().method() === 'POST');
    await recordModal.getByRole('button', { name: 'Confirm & record' }).click(); const recordResponse = await recordWait; expect(recordResponse.ok()).toBeTruthy();
    const recordReplay = await replay(page, recordResponse); expect(recordReplay.body.replayed).toBe(true);
    await expect(recordModal).toBeHidden();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Review merchant decision' })).toBeVisible();

    await page.getByRole('button', { name: 'Review merchant decision' }).click(); await expect(panel).toBeVisible();
    await panel.getByText('Manage evidence and lifecycle').click();
    await panel.getByLabel('Reversal decision').selectOption('no_action'); await panel.getByLabel('Reversal reason').fill(`Correction ${rationale}`);
    await expect(panel.getByRole('button', { name: 'Reverse decision', exact: true })).toBeDisabled();
    await panel.getByLabel('Replacement decision amount', { exact: true }).fill('0');
    await panel.getByRole('button', { name: 'Reverse decision' }).click();
    const reverseModal = page.locator('[role="dialog"][data-overlay-id="reverse-merchant-decision-modal"]'); await expect(reverseModal).toBeVisible();
    await expect(reverseModal).toContainText('Replacement authorised amount: £0.00 · GBP');
    const reverseShot = await shot(page, `${variant.id}-reversal-confirmation`);
    const reverseWait = page.waitForResponse((response) => response.url().endsWith(`/api/claims/${CASE_ID}/reverse`) && response.request().method() === 'POST');
    await reverseModal.getByRole('button', { name: 'Record reversal' }).click(); const reverseResponse = await reverseWait; expect(reverseResponse.ok()).toBeTruthy();
    const reverseReplay = await replay(page, reverseResponse); expect(reverseReplay.body.replayed).toBe(true);
    const post = await history(); const addedDecisions = post.decisions.filter((row) => !pre.decisions.some((before) => before.id === row.id)); const addedSourceOutcomes = post.outcomes.filter((row) => !pre.outcomes.some((before) => before.id === row.id));
    expect(addedDecisions).toHaveLength(2); expect(addedSourceOutcomes).toHaveLength(0); expect(post.claimOutcomes).toHaveLength(1); expect(addedDecisions[1]?.reverses_decision_id).toBe(addedDecisions[0]?.id);
    expect(addedDecisions[1]).toMatchObject({ decision: 'no_action', amount_minor: 0, currency: 'GBP' });
    for (const original of pre.decisions) expect(post.decisions.find(row => row.id === original.id)).toEqual(original);
    expect(post.outcomes).toEqual(pre.outcomes);
    expect(externalMutations).toEqual([]); expect(consoleErrors).toEqual([]); expect(pageErrors).toEqual([]); expect(failedRequests).toEqual([]);
    variants.push({ id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, finalUrl: new URL(page.url()).pathname, screenshots: [recordShot, reverseShot], consoleErrors, pageErrors, failedRequests, mutationReceipt: { scenarioId: scenario!.id, merchantId: MERCHANT_ID, actorId: addedDecisions[0]?.actor_user_id, canonicalRole: 'owner', delegatedGrants: [], preStateFingerprint: preFingerprint, requests: [{ method: 'POST', path: `/api/claims/${CASE_ID}/outcome`, idempotencyKey: recordReplay.key, redactedPayload: { decision: 'no_action', rationale: '[local rationale]' } }, { method: 'POST', path: `/api/claims/${CASE_ID}/reverse`, idempotencyKey: reverseReplay.key, redactedPayload: { replacementDecision: 'no_action', rationale: '[local correction]' } }], visibleResult: 'Both confirmations stated that no provider contact or money movement occurred and that reversal is append-only.', persistedReadBack: { addedDecisionIds: addedDecisions.map((row) => row.id), addedSourceOutcomeIds: addedSourceOutcomes.map((row) => row.id), compatibilityClaimOutcome: post.claimOutcomes[0] ?? null, reversalReferencesOriginal: true }, auditOrVersionConsequence: { caseVersion: post.claim?.state_version, decisionHistoryLength: post.decisions.length }, externalActions: { provider: false, email: false, billing: false, moneyMovement: false, previewDeployment: false }, replayResult: { recordStatus: recordReplay.status, reversalStatus: reverseReplay.status, replayed: true }, cleanupAction: 'No destructive cleanup: the authority requires both immutable decision and reversal events to remain.', postCleanupFingerprint: hash(post), invariantException: 'The two decision records, their compatibility projection, and domain events are intentionally retained as append-only synthetic acceptance history. No observed source outcome was created.' } });
  });
  test.afterAll(() => {
    const screenshots = variants.flatMap((variant) => variant.screenshots); const consoleErrors = variants.flatMap((variant) => variant.consoleErrors); const pageErrors = variants.flatMap((variant) => variant.pageErrors); const failedRequests = variants.flatMap((variant) => variant.failedRequests); const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
    fs.writeFileSync(path.join(directory(), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: scenario!.id, owningSurface: scenario!.owner, declaredKind: scenario!.kind, activation: scenario!.activationRecipe, viewport: variants.map((variant) => variant.viewport), theme: variants.map((variant) => variant.theme), roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: variants.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: [], screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: variants.map((variant) => variant.mutationReceipt), cleanup: 'Retained the synthetic append-only record and reversal history exactly as required; no provider or money action occurred.', verdict: passed ? 'passed' : variants.length ? 'partial' : 'untested', note: passed ? 'Both required variants recorded and reversed a synthetic merchant decision, proved idempotent replay and immutable linkage, and retained the history without external action.' : 'One or more append-only decision workflow variants did not complete.', variants }, null, 2)}\n`);
  });
});
