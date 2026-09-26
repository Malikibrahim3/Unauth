import { test, expect, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { TABLES } from '@/lib/supabase/tables';

// Request-race responses are explicitly simulated. Real endpoint checks below
// exercise the current P11 unavailable-preview boundary, never enable erasure.
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const errors: string[] = []; pageErrors.set(page, errors); page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }, info) => { await info.attach('page-errors', { body: JSON.stringify(pageErrors.get(page) ?? []), contentType: 'application/json' }); expect(pageErrors.get(page)).toEqual([]); });
const routes = JSON.parse(readFileSync(path.resolve('artifacts/full-app-acceptance-2026-08-30/physical/routes.json'), 'utf8')).dynamicPaths;
const subject = new URL(routes['/customers/[id]'], 'http://localhost').pathname.split('/').at(-1)!;
const other = '22222222-2222-4222-8222-222222222222';
const statusBody = (id: string) => ({ receipt: { id, scope_counts: {}, effective_at: '', recorded_at: '' }, steps: [{ key: 'backupCycle', state: 'unavailable', detail: 'Backup-cycle status is unavailable.' }], storageCleanup: { totalJobs: 0, counts: {}, retryable: false, nextAttemptAt: null, lastError: null } });
async function enter(page: Page, width: number) {
  await page.setViewportSize({ width, height: 720 });
  await page.goto('/settings/legal/data-privacy');
  await expect(page.locator('[data-surface-id="data-privacy"]')).toBeVisible();
  await page.getByRole('textbox', { name: 'CANONICAL CUSTOMER ID' }).fill(subject);
}
for (const width of [1440, 1024]) {
  test(`privacy supported boundary and workspace review cancel · ${width}`, async ({ page }, info) => {
    await enter(page, width);
    await expect(page.getByText('Erasure preview is unavailable.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: /confirm erasure|preview erasure/i })).toHaveCount(0);
    const before = await page.request.get(`/api/settings/data-subject-access?subjectId=${subject}`);
    expect(before.status()).toBe(200);
    const initial = await before.json();
    const blocked = await page.request.post('/api/settings/data-subject-erasure', { data: { subjectId: subject, idempotencyKey: `forensic-blocked-${width}`, confirm: 'ERASE' } });
    expect(blocked.status()).toBe(409);
    expect((await blocked.json()).code).toBe('erasure_preview_unavailable');
    const after = await page.request.get(`/api/settings/data-subject-access?subjectId=${subject}`);
    expect(after.status()).toBe(200);
    const final = await after.json();
    const { generated_at: initialTime, ...initialRecords } = initial;
    const { generated_at: finalTime, ...finalRecords } = final;
    expect(initialTime).toBeTruthy(); expect(finalTime).toBeTruthy();
    expect(finalRecords).toEqual(initialRecords);
    await info.attach('subject-before-after', { body: JSON.stringify({ before: initial, after: final }), contentType: 'application/json' });
    await page.getByRole('button', { name: 'Check status', exact: true }).click();
    await expect(page.locator('[data-surface-id="data-privacy"]').getByRole('alert')).toContainText('No erasure receipt');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download subject JSON' }).click();
    expect((await download).suggestedFilename()).toBe(`subject-access-${subject}.json`);
    await expect(page.locator('[data-surface-id="data-privacy"]').getByRole('alert')).toHaveCount(0);
    await page.locator('#workspace-deletion > summary').click();
    const confirmation = page.getByRole('textbox', { name: 'TYPE THE WORKSPACE NAME TO CONFIRM' });
    await expect(page.getByRole('button', { name: 'Delete workspace', exact: true })).toBeDisabled();
    await confirmation.fill((await confirmation.getAttribute('placeholder'))!);
    let deletionRequests = 0;
    await page.route('**/api/account/delete', route => { deletionRequests++; return route.abort(); });
    await page.getByRole('button', { name: 'Delete workspace', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete this workspace?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete workspace', exact: true })).toBeFocused();
    expect(deletionRequests).toBe(0);
    await page.screenshot({ path: info.outputPath('privacy-supported-boundary.png') });
  });
  test(`privacy simulated retry clears stale error · ${width}`, async ({ page }) => {
    await enter(page, width);
    let requests = 0;
    await page.route('**/api/settings/data-subject-erasure?*', route => route.fulfill({ status: ++requests === 1 ? 503 : 200, json: requests === 1 ? { error: 'Simulated temporary status failure' } : statusBody('simulated-retry-receipt') }));
    await page.getByRole('button', { name: 'Check status', exact: true }).click();
    await expect(page.locator('[data-surface-id="data-privacy"]').getByRole('alert')).toContainText('Simulated temporary');
    await page.getByRole('button', { name: 'Check status', exact: true }).click();
    await expect(page.getByText('simulated-retry-receipt', { exact: true })).toBeVisible();
    await expect(page.locator('[data-surface-id="data-privacy"]').getByRole('alert')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'CANONICAL CUSTOMER ID' }).fill(other);
    await expect(page.getByRole('region', { name: 'Erasure status' })).toHaveCount(0);
  });
  test(`privacy simulated subject switch ignores late response · ${width}`, async ({ page }) => {
    await enter(page, width);
    const pending: Route[] = [];
    await page.route('**/api/settings/data-subject-erasure?*', route => { pending.push(route); });
    await page.getByRole('button', { name: 'Check status', exact: true }).click();
    await expect.poll(() => pending.length).toBe(1);
    await page.getByRole('textbox', { name: 'CANONICAL CUSTOMER ID' }).fill(other);
    await page.getByRole('button', { name: 'Check status', exact: true }).click();
    await expect.poll(() => pending.length).toBe(2);
    await pending[0].fulfill({ json: statusBody('simulated-old-subject') });
    await expect(page.getByText('simulated-old-subject', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Checking…' })).toBeDisabled();
    await pending[1].fulfill({ json: statusBody('simulated-new-subject') });
    await expect(page.getByText('simulated-new-subject', { exact: true })).toBeVisible();
  });
  test(`privacy simulated concurrent status retains requested download · ${width}`, async ({ page }) => {
    await enter(page, width);
    let pending: Route | undefined;
    await page.route('**/api/settings/data-subject-access?*', route => { pending = route; });
    await page.route('**/api/settings/data-subject-erasure?*', route => route.fulfill({ json: statusBody('simulated-concurrent') }));
    await page.getByRole('button', { name: 'Download subject JSON' }).click();
    await expect.poll(() => Boolean(pending)).toBe(true);
    await page.getByRole('button', { name: 'Check status', exact: true }).click();
    await expect(page.getByText('simulated-concurrent', { exact: true })).toBeVisible();
    const download = page.waitForEvent('download');
    await pending!.fulfill({ json: { simulated: true } });
    expect((await download).suggestedFilename()).toBe(`subject-access-${subject}.json`);
  });
  test(`privacy simulated late download stops after client navigation · ${width}`, async ({ page }) => {
    await enter(page, width);
    let pending: Route | undefined;
    await page.route('**/api/settings/data-subject-access?*', route => { pending = route; });
    await page.evaluate(() => { (window as any).__privacyDownloads = 0; const original = URL.createObjectURL; URL.createObjectURL = function (...args) { (window as any).__privacyDownloads++; return original.apply(URL, args); }; });
    await page.getByRole('button', { name: 'Download subject JSON' }).click();
    await expect.poll(() => Boolean(pending)).toBe(true);
    await page.getByRole('link', { name: 'Find the customer record' }).click();
    await expect(page).toHaveURL(/\/customers$/);
    await expect(page.locator('[data-surface-id="customers-registry"]')).toBeVisible();
    await expect(page.locator('[data-surface-id="data-privacy"]')).toHaveCount(0);
    const response = page.waitForResponse(r => r.url().includes('/api/settings/data-subject-access'));
    await pending!.fulfill({ json: { simulated: true } });
    await (await response).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate(() => (window as any).__privacyDownloads)).toBe(0);
  });
}

test('Privacy APIs enforce anonymous, viewer, delegated analyst and cross-workspace boundaries',async({page,browser},info)=>{
  const base=new URL(String(info.project.use.baseURL));const db=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  expect(process.env.RELEASE_E2E_LOCAL).toBe('1');expect(['127.0.0.1','localhost','[::1]']).toContain(base.hostname);expect(['127.0.0.1','localhost','[::1]']).toContain(db.hostname);
  const manifest=JSON.parse(readFileSync(path.resolve('artifacts/merchant-clarity-implementation/2026-09-09-ui-forensics-01/P12/ui-forensics/continuations/visual-55d98df4-f9da-4f74-b254-e34d54fe3388-1789000194093/fixture-manifest.json'),'utf8'));
  expect(manifest.localOnly).toBe(true);expect(manifest.visualMemberRole).toBe('analyst');
  const service=createClient(db.toString(),process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const merchant=await service.from('merchants').select('is_demo,settings').eq('id',manifest.visualMerchantId).single();expect(merchant.error).toBeNull();expect(merchant.data?.is_demo).toBe(true);expect(merchant.data?.settings?.synthetic_fixture?.dataset_id).toBe('asterlane-august-2026-loss-desk');
  const ownedId=randomUUID();const marker={forensic_privacy_permission:ownedId,localOnly:true};
  const foreign=await service.from(TABLES.MERCHANT_CUSTOMERS).insert({id:ownedId,merchant_id:manifest.visualMerchantId,display_name:'Disposable privacy permission probe',email:`privacy-${ownedId}@example.invalid`,raw_metadata:marker}).select('id').single();expect(foreign.error).toBeNull();expect(foreign.data?.id).toBe(ownedId);
  let viewerUserId:string|undefined;const viewerMemberId=randomUUID();
  try {
  const viewers=await service.from('merchant_users').select('id').eq('merchant_id',manifest.visualMerchantId).eq('role','viewer').eq('invite_status','active');expect(viewers.error).toBeNull();expect(viewers.data).toEqual([]);
  const viewerEmail=`privacy-viewer-${ownedId}@example.invalid`;
  const user=await service.auth.admin.createUser({email:viewerEmail,email_confirm:true,user_metadata:{forensic_privacy_permission:ownedId,setup_complete:true}});expect(user.error).toBeNull();viewerUserId=user.data.user!.id;
  const member=await service.from('merchant_users').insert({id:viewerMemberId,merchant_id:manifest.visualMerchantId,user_id:viewerUserId,invited_email:viewerEmail,role:'viewer',invite_status:'active',accepted_at:new Date().toISOString()});expect(member.error).toBeNull();
  await enter(page,1440);
  const cross=await page.request.get(`/api/settings/data-subject-access?subjectId=${foreign.data!.id}`);expect(cross.status()).toBe(404);expect((await cross.json()).error).toBe('Customer not found in this workspace.');
  const anonymous=await browser.newContext({baseURL:base.origin,storageState:{cookies:[],origins:[]}});
  const analyst=await browser.newContext({baseURL:base.origin,storageState:{cookies:[],origins:[]}});
  const checked:unknown[]=[];
  try{
    for(const endpoint of ['data-subject-access','data-subject-erasure']){const result=await anonymous.request.get(`/api/settings/${endpoint}?subjectId=${subject}`);expect(result.status()).toBe(401);checked.push({role:'anonymous',endpoint,status:result.status()});}
    const anonPost=await anonymous.request.post('/api/settings/data-subject-erasure',{data:{subjectId:subject,idempotencyKey:'forensic-anonymous-denied',confirm:'ERASE'}});expect(anonPost.status()).toBe(401);
    const ap=await analyst.newPage();const auth=new URL('/api/test/e2e-auth',base);auth.searchParams.set('secret',process.env.E2E_AUTH_SECRET!);auth.searchParams.set('merchant_id',manifest.visualMerchantId);auth.searchParams.set('member_role','analyst');auth.searchParams.set('redirect','/overview');await ap.goto(auth.toString());await expect(ap).toHaveURL(/\/overview$/);
    const allowed=await analyst.request.get(`/api/settings/data-subject-access?subjectId=${ownedId}`);expect(allowed.status()).toBe(200);
    const blocked=await analyst.request.post('/api/settings/data-subject-erasure',{data:{subjectId:ownedId,idempotencyKey:'forensic-delegated-preview-blocked',confirm:'ERASE'}});expect(blocked.status()).toBe(409);expect((await blocked.json()).code).toBe('erasure_preview_unavailable');
    // Reuse only this owned context, now sign into the uniquely created viewer.
    auth.searchParams.set('member_role','viewer');await ap.goto(auth.toString());await expect(ap).toHaveURL(/\/overview$/);
    for(const endpoint of ['data-subject-access','data-subject-erasure']){const result=await analyst.request.get(`/api/settings/${endpoint}?subjectId=${ownedId}`);expect(result.status()).toBe(403);checked.push({role:'viewer',endpoint,status:result.status()});}
    const denied=await analyst.request.post('/api/settings/data-subject-erasure',{data:{subjectId:ownedId,idempotencyKey:'forensic-viewer-denied',confirm:'ERASE'}});expect(denied.status()).toBe(403);
    await ap.goto('/settings/legal/data-privacy');await expect(ap.getByRole('button',{name:'Download subject JSON',exact:true})).toHaveCount(0);await ap.screenshot({path:info.outputPath('viewer-privacy-boundary.png')});
    await info.attach('permission-boundaries',{body:JSON.stringify({checked,anonymousPost:401,viewerPost:403,delegatedAnalystExport:200,delegatedAnalystPreviewBlock:409,ownerCrossWorkspace:404,noBusinessMutation:true,disposableSubject:ownedId}),contentType:'application/json'});
  }finally{await analyst.close();await anonymous.close();}
  } finally {
    if(viewerUserId){
      const deletedMember=await service.from('merchant_users').delete().eq('id',viewerMemberId).eq('merchant_id',manifest.visualMerchantId).eq('user_id',viewerUserId).select('id');expect(deletedMember.error).toBeNull();
      const owned=await service.auth.admin.getUserById(viewerUserId);expect(owned.error).toBeNull();expect(owned.data.user?.user_metadata?.forensic_privacy_permission).toBe(ownedId);
      const deletedUser=await service.auth.admin.deleteUser(viewerUserId);expect(deletedUser.error).toBeNull();const absentUser=await service.auth.admin.getUserById(viewerUserId);expect(absentUser.error?.status).toBe(404);expect(absentUser.data.user).toBeNull();
      const absentMember=await service.from('merchant_users').select('id').eq('id',viewerMemberId);expect(absentMember.error).toBeNull();expect(absentMember.data).toEqual([]);
      await info.attach('disposable-viewer-cleanup',{body:JSON.stringify({userId:viewerUserId,memberId:viewerMemberId,absenceVerified:true}),contentType:'application/json'});
    }
    const removed=await service.from(TABLES.MERCHANT_CUSTOMERS).delete().eq('id',ownedId).eq('merchant_id',manifest.visualMerchantId).contains('raw_metadata',marker).select('id');expect(removed.error).toBeNull();expect(removed.data).toEqual([{id:ownedId}]);
    const absent=await service.from(TABLES.MERCHANT_CUSTOMERS).select('id').eq('id',ownedId);expect(absent.error).toBeNull();expect(absent.data).toEqual([]);
    await info.attach('disposable-customer-cleanup',{body:JSON.stringify({id:ownedId,merchantId:manifest.visualMerchantId,marker,deleted:1,absenceVerified:true}),contentType:'application/json'});
  }
});
