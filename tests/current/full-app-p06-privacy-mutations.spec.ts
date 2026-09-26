import { expect, test, type TestInfo } from '@playwright/test';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import {
  authenticateFixture,
  captureScenario,
  localServiceClient,
  requireRemainingClosurePlan,
  runtimeObserver,
  setLightOnlyAppearance,
  writeScenarioReceipt,
  type RemainingFixturePlan,
} from './remainingClosureHelpers';

const scenario = scenarioLedger.find((entry) => entry.id === 'data-erasure-and-account-deletion-modals');
if (!scenario) throw new Error('Manifest scenario data-erasure-and-account-deletion-modals is missing.');
let plan: RemainingFixturePlan;
const evidence = new Map<string, Record<string, unknown>>();

test.beforeAll(() => {
  plan = requireRemainingClosurePlan();
});

test.describe.serial('FAR-3 disposable privacy mutations', () => {
  test('erases only the purpose-created privacy subject while retaining financial and audit truth', async ({ page, context }, info: TestInfo) => {
    const baseURL = String(info.project.use.baseURL);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightOnlyAppearance(context, baseURL, 'light');
    await authenticateFixture(page, baseURL, plan.fixtures.privacy, '/settings/legal/data-privacy');
    const runtime = runtimeObserver(page, baseURL);
    const subjectId = plan.fixtures.privacy.subjectId;
    if (!subjectId) throw new Error('Privacy fixture plan omitted its purpose-created subject ID.');

    await page.getByPlaceholder('Customer record UUID').fill(subjectId);
    await page.getByRole('button', { name: 'Preview erasure' }).click();
    const modal = page.locator('[data-overlay-id="data-erasure-and-account-deletion-modals"]');
    await expect(modal.getByText('Non-PII receipt, financial entries, and audit history')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await page.getByPlaceholder('ERASE').fill('ERASE');
    await page.getByRole('button', { name: 'Erase this customer' }).click();
    const erasureResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/settings/data-subject-erasure') && response.request().method() === 'POST');
    await modal.getByRole('button', { name: 'Erase customer data' }).click();
    const erasureResponse = await erasureResponsePromise;
    const erasureBody = await erasureResponse.json() as { receiptId?: string; replayed?: boolean };
    expect(erasureResponse.status()).toBe(200);
    expect(erasureBody.receiptId).toBeTruthy();

    const idempotencyKey = erasureResponse.request().postDataJSON()?.idempotencyKey;
    expect(typeof idempotencyKey).toBe('string');
    const replay = await page.evaluate(async ({ subjectId, idempotencyKey }) => {
      const response = await fetch('/api/settings/data-subject-erasure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subjectId, idempotencyKey, confirm: 'ERASE' }),
      });
      return { status: response.status, body: await response.json() as { receiptId?: string; replayed?: boolean } };
    }, { subjectId, idempotencyKey: idempotencyKey as string });
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ receiptId: erasureBody.receiptId, replayed: true });

    const service = localServiceClient();
    const [customer, sourceCustomer, sourceOrder, financial, audit, receipt] = await Promise.all([
      service.from('merchant_customers').select('id,display_name,email,erased_at,erasure_receipt_id').eq('id', subjectId).single(),
      service.from('source_customers').select('id,email,first_name,last_name,raw_metadata').eq('merchant_id', plan.fixtures.privacy.merchantId).single(),
      service.from('source_orders').select('id,email,customer_email,customer_name').eq('merchant_id', plan.fixtures.privacy.merchantId).single(),
      service.from('case_financial_entries').select('id,state,amount_minor,currency,metadata').eq('merchant_id', plan.fixtures.privacy.merchantId).single(),
      service.from('domain_events').select('id,event_type,aggregate_id,payload').eq('merchant_id', plan.fixtures.privacy.merchantId).order('created_at', { ascending: false }).limit(20),
      service.from('data_subject_erasure_receipts').select('id,merchant_id,subject_reference,effective_at').eq('id', erasureBody.receiptId ?? '').single(),
    ]);
    for (const result of [customer, sourceCustomer, sourceOrder, financial, audit, receipt]) {
      if (result.error) throw new Error(`Privacy read-back failed: ${result.error.message}`);
    }
    expect(customer.data).toMatchObject({ id: subjectId, erased_at: expect.any(String), erasure_receipt_id: erasureBody.receiptId });
    expect(customer.data?.display_name).not.toBe('Acceptance privacy subject');
    expect(customer.data?.email ?? '').not.toContain('@example.invalid');
    expect(financial.data).toMatchObject({ state: 'confirmed_loss', amount_minor: 2500, currency: 'GBP' });
    expect(audit.data?.length ?? 0).toBeGreaterThan(0);
    expect(receipt.data).toMatchObject({ merchant_id: plan.fixtures.privacy.merchantId, subject_reference: subjectId });
    const screenshot = await captureScenario(page, scenario.id, 'desktop-light-subject-erased.png');
    expect(runtime.consoleErrors).toEqual([]);
    expect(runtime.pageErrors).toEqual([]);
    expect(runtime.failedRequests).toEqual([]);
    evidence.set('subject-erasure', {
      screenshot,
      receiptId: erasureBody.receiptId,
      replayed: replay.body.replayed,
      retainedFinancialFact: { state: financial.data?.state, amountMinor: financial.data?.amount_minor, currency: financial.data?.currency },
      retainedAuditCount: audit.data?.length ?? 0,
      personalFieldsRedacted: true,
      ...runtime,
    });
  });

  test('runs the existing owner-only resumable workspace deletion against the separate disposable merchant', async ({ page, context }, info: TestInfo) => {
    const baseURL = String(info.project.use.baseURL);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightOnlyAppearance(context, baseURL, 'light');
    await authenticateFixture(page, baseURL, plan.fixtures.workspaceDeletion, '/settings/legal/data-privacy');
    const runtime = runtimeObserver(page, baseURL);

    const workspaceDeletion = page.locator('#workspace-deletion');
    await workspaceDeletion.locator('summary').click();
    const confirmation = await workspaceDeletion.locator('input[placeholder^="DELETE "]').getAttribute('placeholder');
    if (!confirmation) throw new Error('Workspace deletion confirmation prompt was not available to the fixture owner.');
    await workspaceDeletion.locator('input[placeholder^="DELETE "]').fill(confirmation);
    await workspaceDeletion.getByRole('button', { name: 'Delete workspace' }).click();
    const modal = page.locator('[data-overlay-id="data-erasure-and-account-deletion-modals"]');
    await expect(modal.getByText('This permanently removes the workspace')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await page.getByRole('button', { name: 'Delete workspace' }).click();
    const deletionResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/account/delete') && response.request().method() === 'POST');
    await modal.getByRole('button', { name: 'Delete workspace permanently' }).click();
    const deletionResponse = await deletionResponsePromise;
    const deletionBody = await deletionResponse.json() as { jobId?: string; receiptId?: string; status?: string; stage?: string };
    expect(deletionResponse.status()).toBe(200);
    expect(deletionBody).toMatchObject({ status: 'completed', stage: 'completed' });

    const service = localServiceClient();
    const [merchant, job, receipt] = await Promise.all([
      service.from('merchants').select('id').eq('id', plan.fixtures.workspaceDeletion.merchantId).maybeSingle(),
      service.from('workspace_deletion_jobs').select('id,status,stage,receipt_id').eq('id', deletionBody.jobId ?? '').single(),
      service.from('workspace_deletion_receipts').select('id,merchant_reference,verified_at').eq('id', deletionBody.receiptId ?? '').single(),
    ]);
    if (merchant.error || job.error || receipt.error) throw new Error(`Workspace deletion read-back failed: ${merchant.error?.message ?? job.error?.message ?? receipt.error?.message}`);
    expect(merchant.data).toBeNull();
    expect(job.data).toMatchObject({ status: 'completed', stage: 'completed', receipt_id: deletionBody.receiptId });
    expect(receipt.data).toMatchObject({ merchant_reference: plan.fixtures.workspaceDeletion.merchantId });
    const screenshot = await captureScenario(page, scenario.id, 'desktop-light-workspace-deleted.png');
    expect(runtime.consoleErrors).toEqual([]);
    expect(runtime.pageErrors).toEqual([]);
    expect(runtime.failedRequests).toEqual([]);
    evidence.set('workspace-deletion', {
      screenshot,
      jobId: deletionBody.jobId,
      receiptId: deletionBody.receiptId,
      durableCompletedReceipt: true,
      merchantRowAbsent: true,
      ...runtime,
    });
  });

  test.afterAll(() => {
    const entries = [...evidence.values()];
    const failures = entries.flatMap((entry) => [
      ...((entry.consoleErrors as string[] | undefined) ?? []),
      ...((entry.pageErrors as string[] | undefined) ?? []),
      ...((entry.failedRequests as string[] | undefined) ?? []),
    ]);
    writeScenarioReceipt(scenario.id, {
      schemaVersion: 1,
      evidenceSource: 'playwright-runtime',
      scenarioId: scenario.id,
      owningSurface: scenario.owner,
      declaredKind: scenario.kind,
      fixture: plan?.fixture ?? null,
      runId: plan?.runId ?? null,
      localOnly: true,
      mutations: Object.fromEntries(evidence),
      permissionDenialCoverage: 'Existing route tests cover non-owner and cross-merchant denials; this runtime proof uses only the dedicated fixture owner.',
      verdict: entries.length === 2 && failures.length === 0 ? 'passed' : 'partial',
      cleanup: 'The privacy merchant is deleted by exact marker-checked cleanup; the workspace-deletion fixture has already removed only its own workspace, and its durable receipt remains product evidence.',
    });
  });
});
