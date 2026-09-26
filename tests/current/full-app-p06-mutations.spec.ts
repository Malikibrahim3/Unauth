import { Buffer } from 'node:buffer';
import { expect, test, type TestInfo } from '@playwright/test';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import {
  authenticateFixture,
  captureScenario,
  localServiceClient,
  registerExactStorageObject,
  registerInvitedAuthUser,
  requireRemainingClosurePlan,
  runtimeObserver,
  setLightOnlyAppearance,
  writeScenarioReceipt,
  type RemainingFixturePlan,
} from './remainingClosureHelpers';

const teamScenario = scenarioLedger.find((entry) => entry.id === 'invite-member-and-transfer-ownership-modals');
const apiScenario = scenarioLedger.find((entry) => entry.id === 'create-reveal-and-revoke-api-key-modals');
const agreementScenario = scenarioLedger.find((entry) => entry.id === 'agreement-upload-and-review-overlays');
if (!teamScenario || !apiScenario || !agreementScenario) throw new Error('A FAR-2 manifest scenario is missing.');

let plan: RemainingFixturePlan;
const evidence = new Map<string, Record<string, unknown>>();

test.beforeAll(() => {
  plan = requireRemainingClosurePlan();
});

function writeReceipt(id: string, scenario: NonNullable<typeof teamScenario>, cleanup: string) {
  const result = evidence.get(id);
  const failures = result
    ? [
        ...((result.consoleErrors as string[] | undefined) ?? []),
        ...((result.pageErrors as string[] | undefined) ?? []),
        ...((result.failedRequests as string[] | undefined) ?? []),
      ]
    : ['No browser evidence captured'];
  writeScenarioReceipt(id, {
    schemaVersion: 1,
    evidenceSource: 'playwright-runtime',
    scenarioId: id,
    owningSurface: scenario.owner,
    declaredKind: scenario.kind,
    fixture: plan?.fixture ?? null,
    runId: plan?.runId ?? null,
    localOnly: true,
    mutation: result ?? null,
    verdict: failures.length === 0 ? 'passed' : 'partial',
    cleanup,
  });
}

test.describe.serial('FAR-2 disposable Settings mutations', () => {
  test('invites a .invalid member and transfers ownership through the existing team contracts', async ({ page, context }, info: TestInfo) => {
    const baseURL = String(info.project.use.baseURL);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightOnlyAppearance(context, baseURL, 'light');
    await authenticateFixture(page, baseURL, plan.fixtures.settings, '/settings/workspace/team');
    const runtime = runtimeObserver(page, baseURL);
    const invitedEmail = `remaining-closure.${plan.runId.slice(0, 8)}.invite@example.invalid`;

    await page.getByRole('button', { name: 'Invite member' }).click();
    const inviteDialog = page.locator('[data-overlay-id="invite-member-and-transfer-ownership-modals"]');
    await expect(inviteDialog).toBeVisible();
    await expect(inviteDialog.getByRole('button', { name: 'Send invitation' })).toBeEnabled();
    await inviteDialog.getByLabel('Email address').fill(invitedEmail);
    const inviteResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/team') && response.request().method() === 'POST');
    await inviteDialog.getByRole('button', { name: 'Send invitation' }).click();
    const inviteResponse = await inviteResponsePromise;
    const inviteBody = await inviteResponse.json() as { member?: { id?: string; user_id?: string; invited_email?: string }; inviteSent?: boolean };
    expect(inviteResponse.status(), JSON.stringify(inviteBody)).toBe(201);
    expect(inviteBody).toMatchObject({ inviteSent: true, member: { invited_email: invitedEmail } });
    const memberId = inviteBody.member?.id;
    const userId = inviteBody.member?.user_id;
    if (!memberId || !userId) throw new Error('Local invite did not return its member and auth identifiers.');
    registerInvitedAuthUser(plan, { id: userId, email: invitedEmail, merchantId: plan.fixtures.settings.merchantId, memberId });

    const service = localServiceClient();
    const activation = await service
      .from('merchant_users')
      .update({ invite_status: 'active', accepted_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('merchant_id', plan.fixtures.settings.merchantId)
      .select('id,user_id,role,invite_status,invited_email')
      .single();
    if (activation.error || !activation.data) throw new Error(`Local invite activation failed: ${activation.error?.message ?? 'missing row'}`);
    expect(activation.data).toMatchObject({ id: memberId, user_id: userId, invite_status: 'active', invited_email: invitedEmail });

    await page.goto('/settings/workspace/team', { waitUntil: 'domcontentloaded' });
    const roleSelect = page.getByLabel(`Role for ${invitedEmail}`);
    await expect(roleSelect).toBeVisible({ timeout: 30_000 });
    await roleSelect.selectOption('owner');
    const transferDialog = page.locator('[data-overlay-id="invite-member-and-transfer-ownership-modals"]');
    await expect(transferDialog.getByText('Type TRANSFER to confirm')).toBeVisible();
    await expect(transferDialog.getByRole('button', { name: 'Transfer ownership' })).toBeDisabled();
    await transferDialog.getByRole('textbox').fill('TRANSFER');
    const transferResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/team/${memberId}`) && response.request().method() === 'PATCH');
    await transferDialog.getByRole('button', { name: 'Transfer ownership' }).click();
    const transferResponse = await transferResponsePromise;
    expect(transferResponse.status()).toBe(200);

    const memberships = await service
      .from('merchant_users')
      .select('id,user_id,role,invite_status,invited_email')
      .eq('merchant_id', plan.fixtures.settings.merchantId)
      .eq('invite_status', 'active');
    if (memberships.error) throw new Error(`Team read-back failed: ${memberships.error.message}`);
    const owners = (memberships.data ?? []).filter((member) => member.role === 'owner');
    expect(owners).toHaveLength(1);
    expect(owners[0]).toMatchObject({ id: memberId, user_id: userId, invited_email: invitedEmail });
    // The database trigger appends the immutable audit domain event in the
    // same transaction as the membership/ownership mutation. The readable
    // user_action_log is an asynchronous projection owned by the worker, so
    // this acceptance check reads the durable source directly.
    const audit = await service
      .from('domain_events')
      .select('id,event_type,aggregate_type,aggregate_id,created_at')
      .eq('merchant_id', plan.fixtures.settings.merchantId)
      .eq('event_type', 'audit.action_recorded')
      .eq('aggregate_type', 'merchant_member')
      .order('created_at', { ascending: false })
      .limit(20);
    if (audit.error) throw new Error(`Team audit read-back failed: ${audit.error.message}`);
    expect(audit.data?.length ?? 0).toBeGreaterThan(0);
    const screenshot = await captureScenario(page, teamScenario.id, 'desktop-light-transfer.png');
    expect(runtime.consoleErrors).toEqual([]);
    expect(runtime.pageErrors).toEqual([]);
    expect(runtime.failedRequests).toEqual([]);
    evidence.set(teamScenario.id, {
      viewport: '1440x900',
      theme: 'light',
      screenshot,
      invite: { status: inviteResponse.status(), localMailCatcherOnly: true, activatedMembershipId: memberId },
      ownershipReadback: { activeOwnerCount: owners.length, newOwnerMemberId: memberId, auditEventCount: audit.data?.length ?? 0 },
      ...runtime,
    });
  });

  test('creates, reveal-closes, reads back, and revokes one Scale API key without retaining its secret', async ({ page, context }, info: TestInfo) => {
    const baseURL = String(info.project.use.baseURL);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightOnlyAppearance(context, baseURL, 'light');
    await authenticateFixture(page, baseURL, plan.fixtures.settings, '/settings/developers/api-access');
    const runtime = runtimeObserver(page, baseURL);

    await expect(page.locator('[data-state-id="api-keys-empty"]')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Create a key' }).click();
    const dialog = page.locator('[data-overlay-id="create-reveal-and-revoke-api-key-modals"]');
    await expect(dialog.getByRole('button', { name: 'Create key' })).toBeDisabled();
    await dialog.getByLabel('Label').fill('Remaining closure key');
    await dialog.getByText('cases:read').click();
    const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/settings/api-keys') && response.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Create key' }).click();
    const createResponse = await createResponsePromise;
    const createBody = await createResponse.json() as { key?: { id?: string; secret?: string; widget_token?: string; key_prefix?: string; scopes?: string[]; rate_limit_per_minute?: number } };
    expect(createResponse.status()).toBe(200);
    const keyId = createBody.key?.id;
    if (!keyId) throw new Error('Local API key create response omitted its identifier.');
    expect(createBody.key?.secret).toBeTruthy();
    expect(createBody.key?.widget_token).toBeTruthy();
    // The raw values remain in the browser state only. No screenshot, receipt,
    // console output, or test variable serialization records them.
    await dialog.getByRole('button', { name: 'I saved these credentials' }).click();
    await expect(dialog).toBeHidden();

    const listReadback = await page.evaluate(async () => {
      const response = await fetch('/api/settings/api-keys');
      return { status: response.status, body: await response.json() as { keys?: Array<Record<string, unknown>> } };
    });
    expect(listReadback.status).toBe(200);
    const keyRow = listReadback.body.keys?.find((key) => key.id === keyId);
    expect(keyRow).toMatchObject({ id: keyId, name: 'Remaining closure key', revoked_at: null });
    expect(keyRow).not.toHaveProperty('secret');
    expect(keyRow).not.toHaveProperty('widget_token');

    await page.getByTitle('Revoke Remaining closure key').click();
    await expect(dialog.getByRole('button', { name: 'Revoke key' })).toBeVisible();
    const revokeResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/settings/api-keys/${keyId}`) && response.request().method() === 'DELETE');
    await dialog.getByRole('button', { name: 'Revoke key' }).click();
    const revokeResponse = await revokeResponsePromise;
    expect(revokeResponse.status()).toBe(200);
    const service = localServiceClient();
    const revoked = await service
      .from('merchant_api_keys')
      .select('id,key_prefix,name,scopes,rate_limit_per_minute,revoked_at')
      .eq('id', keyId)
      .eq('merchant_id', plan.fixtures.settings.merchantId)
      .single();
    if (revoked.error) throw new Error(`API key read-back failed: ${revoked.error.message}`);
    expect(revoked.data?.revoked_at).toBeTruthy();
    const replay = await page.evaluate(async (id) => {
      const response = await fetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' });
      return { status: response.status, body: await response.json().catch(() => null) };
    }, keyId);
    expect([200, 404]).toContain(replay.status);
    const screenshot = await captureScenario(page, apiScenario.id, 'desktop-light-revoked.png');
    expect(runtime.consoleErrors).toEqual([]);
    expect(runtime.pageErrors).toEqual([]);
    expect(runtime.failedRequests).toEqual([]);
    evidence.set(apiScenario.id, {
      viewport: '1440x900',
      theme: 'light',
      screenshot,
      keyReadback: { id: keyId, prefix: revoked.data?.key_prefix, scopes: revoked.data?.scopes, rateLimit: revoked.data?.rate_limit_per_minute, revoked: Boolean(revoked.data?.revoked_at) },
      secretRetention: 'Raw secret and widget token were asserted in browser memory only and omitted from all persisted evidence.',
      replay: { status: replay.status },
      ...runtime,
    });
  });

  test('uploads and reviews one synthetic agreement while registering its exact storage object for teardown', async ({ page, context }, info: TestInfo) => {
    const baseURL = String(info.project.use.baseURL);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLightOnlyAppearance(context, baseURL, 'light');
    await authenticateFixture(page, baseURL, plan.fixtures.settings, '/settings/legal/agreements');
    const runtime = runtimeObserver(page, baseURL);

    await page.getByRole('button', { name: 'Upload an agreement' }).first().click();
    const uploadDialog = page.getByRole('dialog', { name: 'Upload an agreement' });
    const reviewDialog = page.getByRole('dialog', { name: 'Approve verified agreement term?' });
    await uploadDialog.locator('input[type="file"]').setInputFiles({
      name: 'synthetic-acceptance-agreement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% synthetic local acceptance document only\n'),
    });
    await uploadDialog.getByLabel('Counterparty').fill('Synthetic carrier');
    const uploadResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/agreements/upload') && response.request().method() === 'POST');
    await uploadDialog.getByRole('button', { name: 'Upload agreement' }).click();
    const uploadResponse = await uploadResponsePromise;
    const uploadBody = await uploadResponse.json() as { agreement?: { id?: string } };
    expect(uploadResponse.status()).toBe(200);
    const agreementId = uploadBody.agreement?.id;
    if (!agreementId) throw new Error('Local agreement upload omitted its agreement ID.');

    const service = localServiceClient();
    const agreement = await service
      .from('agreements')
      .select('id,document_url,status,file_mime_type,file_size_bytes,uploaded_by')
      .eq('id', agreementId)
      .eq('merchant_id', plan.fixtures.settings.merchantId)
      .single();
    if (agreement.error || !agreement.data?.document_url) throw new Error(`Agreement read-back failed: ${agreement.error?.message ?? 'missing document path'}`);
    expect(agreement.data).toMatchObject({ id: agreementId, status: 'needs_review', file_mime_type: 'application/pdf' });
    registerExactStorageObject(plan, { bucket: 'integration-documents', path: agreement.data.document_url });

    await expect(page.getByText('Document uploaded. Review its source facts before approving a term.')).toBeVisible();
    // Modal presence is animated. Wait for its inert/focus-trap environment to
    // release before targeting the review form underneath it.
    await expect(uploadDialog).toBeHidden();
    await expect(page.locator('section[role="dialog"][data-overlay-id="agreement-upload-and-review-overlays"][data-overlay-state="exiting"]')).toHaveCount(0);
    const ruleName = page.locator('input[name="rule_name"]');
    const recoveryRoute = page.locator('input[name="recovery_route"]');
    const verifiedReason = page.locator('textarea[name="reason"]');
    await ruleName.fill('Synthetic recovery eligibility');
    await recoveryRoute.fill('Synthetic carrier claim');
    await verifiedReason.fill('A local synthetic document is reviewed only for acceptance coverage.');
    await expect(ruleName).toHaveValue('Synthetic recovery eligibility');
    await expect(recoveryRoute).toHaveValue('Synthetic carrier claim');
    await expect(verifiedReason).toHaveValue('A local synthetic document is reviewed only for acceptance coverage.');
    await page.getByRole('button', { name: 'Review approval' }).click();
    await expect(reviewDialog.getByRole('button', { name: 'Approve term' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(reviewDialog).toBeHidden();
    await page.getByRole('button', { name: 'Review approval' }).click();
    const ruleResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/agreements/${agreementId}/rules`) && response.request().method() === 'POST');
    await reviewDialog.getByRole('button', { name: 'Approve term' }).click();
    expect((await ruleResponsePromise).status()).toBe(200);
    const reviewed = await service.from('agreements').select('status').eq('id', agreementId).single();
    if (reviewed.error) throw new Error(`Agreement review read-back failed: ${reviewed.error.message}`);
    expect(['active', 'approved']).toContain(reviewed.data?.status);
    const screenshot = await captureScenario(page, agreementScenario.id, 'desktop-light-reviewed.png');
    expect(runtime.consoleErrors).toEqual([]);
    expect(runtime.pageErrors).toEqual([]);
    expect(runtime.failedRequests).toEqual([]);
    evidence.set(agreementScenario.id, {
      viewport: '1440x900',
      theme: 'light',
      screenshot,
      agreementReadback: { id: agreementId, status: reviewed.data?.status, mimeType: agreement.data.file_mime_type, sizeBytes: agreement.data.file_size_bytes },
      storageCleanup: { bucket: 'integration-documents', exactPathRegistered: true },
      rawDocumentContentRetained: false,
      ...runtime,
    });
  });

  test.afterAll(() => {
    writeReceipt(teamScenario.id, teamScenario, 'The fixture cleanup deletes the exact marked Settings merchant and the registered .invalid invited auth identity after marker and invitation-metadata validation.');
    writeReceipt(apiScenario.id, apiScenario, 'The exact marked Settings merchant is removed; raw key credentials were never written to evidence.');
    writeReceipt(agreementScenario.id, agreementScenario, 'The exact registered local integration-documents object is removed before the exact marked Settings merchant is deleted.');
  });
});
