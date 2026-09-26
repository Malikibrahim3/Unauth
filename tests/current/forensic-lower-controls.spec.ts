import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { HELP_ARTICLES } from '@/lib/help/registry';
const dynamic = JSON.parse(readFileSync(path.resolve('artifacts/full-app-acceptance-2026-08-30/physical/routes.json'), 'utf8')).dynamicPaths;
const entries = [
  ['customer-profile',dynamic['/customers/[id]']],
  ['file-claim','/financials/recovery/new'],
  ['report-supporting-records','/financials/reports/records'],
  ['recovery-rulebook','/controls/rules/recovery'],
  ['rule-version-workbench',dynamic['/controls/rules/[ruleId]']],
  ['build-evidence-package',dynamic['/customers/[id]/evidence/new']],
  ['platform-defaults','/settings/product/platform'],
  ['notification-preferences','/settings/product/notifications'],
  ['developer-api-access','/settings/developers/api-access'],
  ['agreements','/settings/legal/agreements'],
  ['billing','/settings/billing'],
  ['help-index','/help'],
  ['help-search','/help?q=decision'],
  ['help-exact-article','/help/credit-reconciliation'],
  ['help-article',dynamic['/help/[articleSlug]']],
  ['import-job-route',dynamic['/sources/imports/[jobId]']],
] as const;
for (const [id, route] of entries) for (const width of [1440,1024]) {
  test(`${id} lower-control reachability · ${width}`, async ({ page }, info) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width,height:600});
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByText('Something went wrong', {exact:true})).toHaveCount(0);
    if (id === 'customer-profile') { await expect(page.getByRole('region', { name: 'Merchant notes', exact: true })).toBeVisible(); await expect(page.getByText('Loading notes…', { exact: true })).toHaveCount(0); }
    await page.screenshot({path:info.outputPath('top.png')});
    const dialog = page.locator('[role="dialog"]:visible').last();
    const scope = await dialog.count() ? dialog : page.locator('main').first();
    const controls = scope.locator('button:visible, [role="button"]:visible, a[href]:visible, input:visible, select:visible, textarea:visible, summary:visible, p:visible, li:visible');
    const count = await controls.count(); expect(count).toBeGreaterThan(0);
    const checks: unknown[] = [];
    for (let i=Math.max(0,count-10); i<count; i++) {
      const control=controls.nth(i);
      // Detect hidden-overflow ancestors: forced DOM scrolling must not be
      // mistaken for a region a person can scroll with a wheel or trackpad.
      await control.evaluate(element => { let p=element.parentElement; const owners=[]; while(p){owners.push({element:p,top:p.scrollTop,overflow:getComputedStyle(p).overflowY});p=p.parentElement;} (window as any).__lowerControlOwners=owners; });
      await control.scrollIntoViewIfNeeded();
      const result=await control.evaluate(element => {
        const box=element.getBoundingClientRect(); const x=Math.min(innerWidth-1,Math.max(0,box.x+box.width/2)); const y=Math.min(innerHeight-1,Math.max(0,box.y+box.height/2)); const hit=document.elementFromPoint(x,y);
        return {label:(element.getAttribute('aria-label')||element.textContent||element.getAttribute('name')||element.tagName).trim().slice(0,100),box:{x:box.x,y:box.y,width:box.width,height:box.height},reachable:box.top>=-1&&box.bottom<=innerHeight+1&&box.left>=-1&&box.right<=innerWidth+1&&Boolean(hit&&(element===hit||element.contains(hit))),hiddenScroll:((window as any).__lowerControlOwners as any[]).filter(p=>['hidden','clip'].includes(p.overflow)&&Math.abs(p.element.scrollTop-p.top)>2).map(p=>({tag:p.element.tagName,overflow:p.overflow,delta:p.element.scrollTop-p.top}))};
      });
      checks.push(result);
      await info.attach(`control-${i}`,{body:JSON.stringify(result),contentType:'application/json'});
      expect(result.hiddenScroll,`${id}: ${result.label} required scrolling a hidden-overflow owner`).toEqual([]);
      expect(result.reachable,`${id}: ${result.label} is clipped or covered`).toBe(true);
    }
    await page.screenshot({path:info.outputPath('lower-controls.png')});
    await info.attach('reachability',{body:JSON.stringify({scope:'last ten initially visible controls; reachability only, no mutation or full scenario acceptance',checks}),contentType:'application/json'});
    expect(errors).toEqual([]);
  });
}

for (const width of [1440,1024]) for (const entry of [
  { id:'help-wheel', route:'/help', selector:'[data-surface-id="help-index"]', end:'Ask a person' },
  { id:'report-sidebar-wheel', route:'/financials/reports/records', selector:'aside[aria-label="Report scope and export"]', end:'See who exported what' },
  { id:'rulebook-wheel', route:'/controls/rules/recovery', selector:'[data-surface-id="recovery-rulebook"]', end:null },
]) test(`${entry.id} reaches real bottom with wheel · ${width}`, async ({page},info) => {
  await page.setViewportSize({width,height:600}); await page.goto(entry.route);
  const region=page.locator(entry.selector); await expect(region).toBeVisible();
  await region.evaluate(element=>{element.scrollTop=0;});
  const box=(await region.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+Math.min(box.height-8,80));
  await page.mouse.wheel(0,10000);
  await expect.poll(()=>region.evaluate(element=>Math.abs(element.scrollHeight-element.clientHeight-element.scrollTop))).toBeLessThanOrEqual(1);
  const metrics=await region.evaluate(element=>({top:element.scrollTop,max:element.scrollHeight-element.clientHeight,overflow:getComputedStyle(element).overflowY}));
  expect(metrics.max).toBeGreaterThan(0); expect(metrics.overflow).toMatch(/auto|scroll/);
  if(entry.end) await expect(page.getByRole('link',{name:entry.end,exact:true})).toBeInViewport();
  await info.attach('wheel-metrics',{body:JSON.stringify(metrics),contentType:'application/json'});
  await page.screenshot({path:info.outputPath('wheel-bottom.png')});
});

test('Help article feedback works with Enter and Space without persistent storage', async ({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='unauth.help.credit-reconciliation.feedback')throw new DOMException('Simulated storage unavailable','SecurityError');return original.call(this,key,value);};});
  await page.goto('/help/credit-reconciliation');
  const yes=page.getByRole('button',{name:'Yes',exact:true});const no=page.getByRole('button',{name:'Not really',exact:true});
  await yes.focus();await page.keyboard.press('Enter');await expect(yes).toHaveAttribute('aria-pressed','true');
  await no.focus();await page.keyboard.press('Space');await expect(no).toHaveAttribute('aria-pressed','true');await expect(yes).toHaveAttribute('aria-pressed','false');expect(errors).toEqual([]);
});

test('Help article feedback survives a storage write failure',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='unauth.help.credit-reconciliation.feedback')throw new DOMException('Simulated storage unavailable','SecurityError');return original.call(this,key,value);};});
  await page.goto('/help/credit-reconciliation');const yes=page.getByRole('button',{name:'Yes',exact:true});await yes.click();await expect(yes).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

for(const width of [1440,1024])for(const kind of ['partner','rule'])test(`recovery ${kind} editor keyboard lifecycle · ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:600});await page.goto('/controls/rules/recovery');
  const mutations:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(r.method()))mutations.push(r.method()+' '+new URL(r.url()).pathname);});
  const opener=page.locator(`section[aria-label="${kind==='partner'?'Partners and their windows':'Claim rules'}"] button`).first();await opener.click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await dialog.evaluate(element=>({label:element.getAttribute('aria-label'),focusInside:element.contains(document.activeElement),bodyLocked:getComputedStyle(document.body).overflow==='hidden',shellInert:Boolean(document.querySelector('main')?.closest('[inert]'))}));
  await info.attach('editor-before-escape',{body:JSON.stringify(before),contentType:'application/json'});
  const focusables=dialog.locator('button:enabled,input:enabled,select:enabled,textarea:enabled,a[href]');
  await focusables.last().focus();await page.keyboard.press('Tab');await expect(focusables.first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(focusables.last()).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();expect(before.label).toBe(kind==='partner'?'Edit recovery partner':'Edit recovery rule');expect(before.focusInside).toBe(true);expect(before.bodyLocked).toBe(true);
  await opener.click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  await opener.click();await page.locator('[data-overlay-id="partner-and-recovery-rule-modals"]').click({position:{x:5,y:5}});await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  expect(mutations).toEqual([]);
});

test('Help default search accepts typed input and opens matching articles',async({page})=>{
  await page.goto('/help');const search=page.getByRole('textbox',{name:'Search the articles',exact:true});await expect(search).toBeVisible();
  await search.fill('privacy');await search.press('Enter');await expect(page).toHaveURL(/\/help\?q=privacy$/);
  await expect(page.getByRole('link',{name:'Handle subject access, erasure, and workspace deletion',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Manage roles and permissions',exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Handle subject access, erasure, and workspace deletion',exact:true}).click();await expect(page).toHaveURL(/\/help\/privacy-requests$/);await page.goBack();await expect(search).toHaveValue('privacy');await page.reload();await expect(search).toHaveValue('privacy');
});

test('Help evidence-gap link selects the real Needs evidence queue',async({page})=>{
  await page.goto('/help/case-investigation');await page.getByRole('link',{name:'Open evidence-gap queue',exact:true}).click();await expect(page).toHaveURL(/queue=needs_evidence/);await expect(page.getByRole('navigation',{name:'Case work states'}).locator('[aria-current="page"]')).toHaveText('Needs evidence');
});
test('Privacy help explains the current unavailable-preview boundary',async({page})=>{
  await page.goto('/help/privacy-requests');await expect(page.getByText('Erasure preview is unavailable.',{exact:false})).toBeVisible();await expect(page.getByText(/type ERASE, and confirm/)).toHaveCount(0);await page.getByRole('link',{name:'Open data privacy',exact:true}).click();await expect(page.getByText('Erasure preview is unavailable.',{exact:false})).toBeVisible();
});

test('Help search includes the authored privacy guide',async({page})=>{
  await page.goto('/help?q=privacy');await expect(page.getByRole('link',{name:'Handle subject access, erasure, and workspace deletion',exact:true})).toHaveAttribute('href','/help/privacy-requests');
});

test('Default Help exposes every authored guide once and each guide opens',async({page},info)=>{
  await page.goto('/help');const index=page.locator('[data-surface-id="help-index"]');
  await expect(index.locator('a[href^="/help/"]')).toHaveCount(HELP_ARTICLES.length);
  await expect(index.getByText(`${HELP_ARTICLES.length} guides to the decisions and tasks in Unauth.`,{exact:false})).toBeVisible();
  for(const article of HELP_ARTICLES){
    const link=index.getByRole('link',{name:article.title,exact:true});await expect(link).toHaveAttribute('href',`/help/${article.slug}`);await link.click();await expect(page.locator(`[data-help-article="${article.slug}"]`)).toBeVisible();await page.goBack();await expect(index).toBeVisible();
  }
  await expect(index.getByRole('link',{name:'Ask a person',exact:true})).toHaveAttribute('href','mailto:support@unauth.app');
  await page.screenshot({path:info.outputPath('authored-help-index.png')});
});

test('Generic Help feedback remains usable when storage is unavailable',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('unauth.help.'))throw new DOMException('Simulated storage unavailable','SecurityError');return original.call(this,key,value);};});
  await page.goto('/help/activation');const yes=page.getByRole('button',{name:'Yes',exact:true});await yes.focus();await page.keyboard.press('Enter');await expect(yes).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

for(const width of [1440,1024])test(`Overview trust dialog keyboard lifecycle · ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:600});await page.goto('/overview');
  const region=page.getByRole('region',{name:'Overview content',exact:true});
  const box=(await region.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+70);await page.mouse.wheel(0,10000);
  await expect.poll(()=>region.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop))).toBeLessThanOrEqual(1);
  await page.screenshot({path:info.outputPath('overview-bottom.png')});
  const opener=page.getByRole('button',{name:'Can I act on these figures?',exact:true});await opener.click();
  const dialog=page.getByRole('dialog',{name:'Data trust',exact:true});await expect(dialog).toBeVisible();
  await expect.poll(()=>dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);
  const controls=dialog.locator('button:enabled,a[href],input:enabled,[tabindex="0"]');await controls.last().focus();await page.keyboard.press('Tab');await expect(controls.first()).toBeFocused();
  await page.screenshot({path:info.outputPath('trust-dialog.png')});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  await opener.click();await dialog.getByRole('button',{name:/Close/}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
});

for(const width of [1440,1024])test(`Payout rule builder dismissal without writes · ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:600});await page.goto('/controls/rules');
  const mutations:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(r.method()))mutations.push(r.method()+' '+new URL(r.url()).pathname);});
  const opener=page.getByRole('link',{name:'New rule',exact:true});await opener.click();
  const dialog=page.getByRole('dialog',{name:'New payout rule',exact:true});await expect(dialog).toBeVisible();
  await expect.poll(()=>dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);
  await dialog.getByPlaceholder('e.g. Hold high-value claims for review').fill('Unsaved forensic draft');
  const controls=dialog.locator('button:enabled,a[href],input:enabled,textarea:enabled,select:enabled');await controls.last().focus();await page.keyboard.press('Tab');await expect(controls.first()).toBeFocused();
  await page.screenshot({path:info.outputPath('rule-builder.png')});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  await opener.click();await dialog.getByRole('button',{name:'Close rule builder',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();expect(mutations).toEqual([]);
});

for(const width of [1440,1024])test(`Flow editor keyboard dismissal without writes · ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:600});await page.goto('/controls/flows/a1000000-0000-4000-8000-000000000040');
  const mutations:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(r.method()))mutations.push(r.method()+' '+new URL(r.url()).pathname);});
  const opener=page.getByRole('button',{name:'Save draft',exact:true});await opener.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await info.attach('flow-dialog',{body:JSON.stringify(await dialog.evaluate(e=>({label:e.getAttribute('aria-label'),focus:e.contains(document.activeElement),locked:getComputedStyle(document.body).overflow==='hidden'}))),contentType:'application/json'});
  await expect(dialog).toHaveAttribute('aria-label',/flow draft/);await expect.poll(()=>dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);
  const controls=dialog.locator('button:enabled,a[href],input:enabled,textarea:enabled,select:enabled');await controls.last().focus();await page.keyboard.press('Tab');await expect(controls.first()).toBeFocused();
  await page.screenshot({path:info.outputPath('flow-editor.png')});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  await opener.click();await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();expect(mutations).toEqual([]);
});

for(const mode of ['save','test'])test(`Flow ${mode} pending request keeps review open`,async({page},info)=>{
  await page.setViewportSize({width:1440,height:600});await page.goto('/controls/flows/a1000000-0000-4000-8000-000000000040');
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});let intercepted=false;
  await page.route('**/api/workflows/a1000000-0000-4000-8000-000000000040'+(mode==='test'?'/test':''),async route=>{
    if(route.request().method()!==(mode==='test'?'POST':'PATCH'))return route.continue();
    intercepted=true;await pending;await route.fulfill({status:mode==='test'?200:503,contentType:'application/json',body:JSON.stringify(mode==='test'?{matched:false,plannedActions:[],writesPerformed:0}:{error:'Simulated local save failure'})});
  });
  const opener=page.getByRole('button',{name:mode==='save'?'Save draft':'Run dry test',exact:true});await opener.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  try{
    await dialog.getByRole('button',{name:mode==='save'?'Create draft version':'Run test',exact:true}).click();await expect.poll(()=>intercepted).toBe(true);
    await expect(dialog.getByRole('button',{name:'Close dialog',exact:true})).toBeDisabled();await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeDisabled();
    await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
    await info.attach('pending-contract',{body:JSON.stringify({mode,intercepted:true,syntheticResponse:true,noBackendMutation:true}),contentType:'application/json'});
    release();await expect(dialog.getByRole('button',{name:'Close dialog',exact:true})).toBeEnabled();
    if(mode==='save')await expect(dialog.getByText('Draft could not be saved. Check the highlighted configuration and try again.',{exact:true})).toBeVisible();
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  }finally{release();}
});

for(const dimension of ['issue','carrier','sku','warehouse'])for(const width of [1440,1024])test(`Claim pattern ${dimension} reviewed cohort and export · ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:600});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/financials/reports?report=${dimension}&range=30d&timezone=Europe%2FLondon`);
  await expect(page.getByRole('heading',{name:/Claim patterns by/})).toBeVisible();await page.getByLabel('Submitted within',{exact:true}).selectOption('all');await page.getByRole('button',{name:'Apply period',exact:true}).click();await expect(page).toHaveURL(/range=all/);
  const supporting=page.getByRole('region',{name:'Supporting cases',exact:true});await expect(supporting).toBeVisible();
  async function ids(){const rows:string[]=[];for(let i=0;i<20;i++){rows.push(...await supporting.locator('tbody tr td:first-child > a').evaluateAll(elements=>elements.map(e=>new URL((e as HTMLAnchorElement).href).pathname.split('/').at(-1)!)));const next=supporting.getByRole('button',{name:'Next',exact:true});if(await next.isDisabled())return rows;await next.click();}throw new Error('Fixture exceeded bounded pagination');}
  const all=await ids();expect(all.length).toBeGreaterThan(0);expect(new Set(all).size).toBe(all.length);
  const groups=page.getByRole('table').filter({has:page.getByText('All groups, including isolated cases. Monetary columns show known allocated values only.',{exact:true})});
  await groups.getByRole('button',{name:/^View \d+ cases$/}).first().click();const selected=await ids();expect(selected.length).toBeGreaterThan(0);expect(selected.every(id=>all.includes(id))).toBe(true);
  const exportLink=supporting.getByRole('link',{name:'Export these cases',exact:true});const href=(await exportLink.getAttribute('href'))!;
  const downloadPromise=page.waitForEvent('download');await exportLink.click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('unauth-claim-patterns.csv');const target=info.outputPath(`${dimension}-reviewed-cases.csv`);await download.saveAs(target);
  const csv=Papa.parse<Record<string,string>>(readFileSync(target,'utf8'),{header:true,skipEmptyLines:true});expect(csv.errors).toEqual([]);expect([...new Set(csv.data.map(row=>row.case_id))].sort()).toEqual([...selected].sort());expect(csv.data.every(row=>row.dimension===dimension&&row.timezone==='Europe/London')).toBe(true);
  const stale=new URL(href,String(info.project.use.baseURL));stale.searchParams.set('fingerprint','forensic-stale-review');expect((await page.request.get(stale.toString())).status()).toBe(409);
  await supporting.getByRole('button',{name:'Show entire cohort',exact:true}).click();expect((await ids()).sort()).toEqual([...all].sort());await page.screenshot({path:info.outputPath(`${dimension}-cohort.png`)});
  await page.reload();await expect(page.getByRole('heading',{name:/Claim patterns by/})).toBeVisible();await expect(page.getByLabel('Submitted within',{exact:true})).toHaveValue('all');expect(errors).toEqual([]);
  await info.attach('scope',{body:JSON.stringify({dimension,width,allCaseIds:all,selectedCaseIds:selected,exportMatches:true,staleReviewRejected:true,limitation:'Actual read/export and existing fixture cohort only; not every ambiguous allocation or investigation-write branch.'}),contentType:'application/json'});
});

for(const width of [1440,1024])test(`Workspace search typed customer, type filter, keyboard and reload · ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:600});await page.goto(dynamic['/customers/[id]']);await expect(page.locator('[data-surface-id="customer-profile"]')).toBeVisible();const profileResponse=await page.request.get('/api'+dynamic['/customers/[id]']);expect(profileResponse.status()).toBe(200);const profile=(await profileResponse.json()).profile;const name=profile.names?.[0]||profile.primary_email;expect(name).toBeTruthy();await expect(page.getByText(name,{exact:true}).first()).toBeVisible();
  await page.goto('/search');const input=page.getByPlaceholder('Search cases, customers, orders',{exact:true});await input.pressSequentially(name,{delay:20});const customers=page.getByRole('tab',{name:'Customers',exact:true});await customers.click();await expect(customers).toHaveAttribute('aria-selected','true');
  const result=page.locator(`#workspace-search-results a[data-search-result][href="${dynamic['/customers/[id]']}"]`).first();await expect(result).toBeVisible();const destination=(await result.getAttribute('href'))!;expect(destination).toContain('/customers/');
  await input.focus();await page.keyboard.press('ArrowDown');await expect(page.locator('#workspace-search-results a[data-search-result]').first()).toBeFocused();await result.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));await expect(page.locator('[data-surface-id="customer-profile"]')).toBeVisible();
  await page.goBack();await expect(input).toHaveValue(name);await expect(customers).toHaveAttribute('aria-selected','true');await page.reload();await expect(input).toHaveValue(name);await expect(customers).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:'Clear search',exact:true}).click();await expect(input).toHaveValue('');await expect(input).toBeFocused();await page.screenshot({path:info.outputPath('search-cleared.png')});
});

for(const width of [1440,1024])test(`Customer note rejected request releases controls and retains draft · ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:600});await page.goto(dynamic['/customers/[id]']);const opener=page.getByRole('button',{name:'Add note',exact:true});await opener.click();const dialog=page.getByRole('dialog',{name:'Add customer note',exact:true});const draft='Disposable intercepted note; never sent to the database.';await dialog.getByRole('textbox',{name:'Note',exact:true}).fill(draft);
  await page.route('**/api/customers/*/notes',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());
  await dialog.getByRole('button',{name:'Save note',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByRole('button',{name:'Save note',exact:true})).toBeEnabled();await expect(dialog.getByRole('textbox',{name:'Note',exact:true})).toHaveValue(draft);await page.screenshot({path:info.outputPath('note-request-error.png')});await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
});
