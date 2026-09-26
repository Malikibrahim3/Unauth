import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { PLANS, PUBLIC_PLAN_IDS } from '../../lib/billing/plans';
// Uses the existing guard: Docker-derived credentials must resolve to loopback.
const {localSupabaseEnvironment, ACCEPTANCE_MERCHANT_ID} = require('../../scripts/acceptance/local-runtime.mjs');
const root=path.resolve('artifacts/merchant-clarity-implementation/2026-09-06-p01/P01/behaviour-browser');
test('P01 runtime truth, scoped identities and disposable persisted rule roundtrip', async ({browser}) => {
  test.setTimeout(600_000);
  fs.mkdirSync(root,{recursive:true});
  const origin='http://127.0.0.1:3016'; const local=localSupabaseEnvironment();
  const admin=createClient(local.apiUrl,local.serviceRole,{auth:{persistSession:false}});
  const membership=await admin.from('merchant_users').select('user_id').eq('merchant_id',ACCEPTANCE_MERCHANT_ID).eq('role','owner').eq('invite_status','active').single();
  if(membership.error)throw membership.error;
  const user=(await admin.auth.admin.getUserById(membership.data.user_id)).data.user!;
  expect(user.user_metadata.fixture).toBe('release-e2e-local');
  let cookies:any[]=[];
  const auth=createServerClient(local.apiUrl,local.anonKey,{cookies:{getAll:()=>cookies,setAll:rows=>{cookies=rows;}}});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const mutations:string[]=[];const records:any[]=[];let ruleId:string|null=null;let versionId:string|null=null;
  await context.route('**/*',route=> {
    const url=new URL(route.request().url());
    if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))return route.abort();
    if(route.request().method()!=='GET' && url.pathname.startsWith('/api/') && url.pathname !== '/api/csp-report'){mutations.push(url.pathname);return route.abort();}
    return route.continue();
  });
  context.setDefaultTimeout(20000); context.setDefaultNavigationTimeout(120000);
  const page=await context.newPage();
  async function capture(id:string,target=page){await target.evaluate(()=>document.fonts.ready);await target.screenshot({path:path.join(root,id+'.png'),fullPage:true});fs.writeFileSync(path.join(root,id+'.txt'),await target.locator('body').innerText());records.push({id,path:new URL(target.url()).pathname,viewport:target.viewportSize(),screenshot:id+'.png'});console.log(`P01 ${id}`);}
  try{
    const link=await admin.auth.admin.generateLink({type:'magiclink',email:user.email!});if(link.error)throw link.error;
    const verified=await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'email'});if(verified.error)throw verified.error;
    await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,secure:false,httpOnly:c.options?.httpOnly??false,sameSite:'Lax'})));
    await page.goto(origin+'/pricing',{timeout:120_000});
    for(const id of PUBLIC_PLAN_IDS){const plan=PLANS[id];const card=page.locator(`[data-plan-id="${id}"]`);await expect(card).toContainText(plan.priceGbp==='custom'?'Custom':`£${plan.priceGbp}`);await expect(card.locator('a')).toHaveAttribute('href',`/signup?plan=${id}`);}
    await capture('pricing-all-plans');
    for(const id of PUBLIC_PLAN_IDS){await page.goto(origin+`/signup?plan=${id}`);await expect(page.locator('body')).toContainText(PLANS[id].name);await expect(page.locator('body')).toContainText('does not activate');await capture(`signup-${id}`);}
    let recoverCalls=0;let release:(()=>void)|undefined;
    await page.route('**/auth/v1/recover**',async route=>{recoverCalls++;await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({status:200,contentType:'application/json',body:'{}'});});
    await page.goto(origin+'/reset',{timeout:120_000});
    await expect(page.locator('[data-state-id="password-reset-initial"]')).toBeVisible();await expect(page.getByText('Recovery instructions requested')).toHaveCount(0);await capture('reset-initial');
    await page.getByLabel('Email').fill('p01-reset@example.invalid');await page.getByRole('button',{name:'Send the link'}).click();
    await expect(page.getByRole('button',{name:'Sending…'})).toBeDisabled();await capture('reset-pending');await expect.poll(()=>recoverCalls).toBe(1);release!();
    await expect(page.locator('[data-state-id="password-reset-sent-state"]')).toBeVisible();await capture('reset-success-stub');
    await page.unroute('**/auth/v1/recover**');await page.route('**/auth/v1/recover**',route=>{recoverCalls++;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({msg:'local failure'})});});
    await page.goto(origin+'/reset');await page.getByLabel('Email').fill('p01-reset@example.invalid');await page.getByRole('button',{name:'Send the link'}).click();await expect(page.locator('[data-state-id="password-reset-error"]')).toBeVisible();await expect(page.getByText('Recovery instructions requested')).toHaveCount(0);await capture('reset-failure-stub');
    await page.goto(origin+'/reset');await page.route('**/login**',route=>route.fulfill({status:200,contentType:'text/html',body:'<main>Local cancel destination</main>'}));const priorCalls=recoverCalls;await page.locator('a[href^="/login"]').first().click();expect(recoverCalls).toBe(priorCalls);await capture('reset-cancel');
    await page.route('**/api/team?**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Local read unavailable"}'}));
    await page.goto(origin+'/settings/workspace/team');await expect(page.getByText('Team registry unavailable').first()).toBeVisible();await expect(page.locator('body')).not.toContainText('0 active seats');await capture('team-unavailable');
    await page.unroute('**/api/team?**');await page.route('**/api/team?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({members:[],currentUser:{id:user.id,email:user.email,role:'owner',memberId:null,canManageTeam:true},audit:[],accountOwner:null})}));
    await page.reload();await expect(page.locator('[data-runtime-topbar]')).toContainText('0 active members');await capture('team-verified-empty');
    await context.route('**/api/search?**',route=>{const q=new URL(route.request().url()).searchParams.get('q');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:q==='Empty'?[]:[{id:q,type:'customer',label:`${q} scoped customer`,href:`/customers/${q}`,source:'shopify'}],total:q==='Empty'?0:1,returnedCount:q==='Empty'?0:1,coverage:'complete',sourcesAnswered:['shopify'],sourcesFailed:[],restrictedTypes:[]})});});
    await page.goto(origin+'/search?q=Alpha');await expect(page.locator('[data-runtime-topbar]')).toContainText('Alpha');await expect(page.getByText('Alpha scoped customer').first()).toBeVisible();await capture('search-alpha');
    const second=await context.newPage();await second.goto(origin+'/search?q=Bravo');await expect(second.getByText('Bravo scoped customer').first()).toBeVisible();await expect(page.locator('[data-runtime-topbar]')).toContainText('Alpha');await capture('search-bravo-independent-tab',second);
    await page.goto(origin+'/search?q=Empty');await expect(page.locator('[data-runtime-topbar]')).toContainText('0 matching records');await expect(page.locator('body')).not.toContainText('Alpha scoped customer');await capture('search-verified-empty');
    await context.unroute('**/api/search?**');await context.route('**/api/search?**',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await page.goto(origin+'/search?q=Unavailable');await expect(page.locator('[data-runtime-topbar]')).toContainText('Search results unavailable');await capture('search-unavailable');
    const ids=['a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222'];
    await context.route('**/api/customers/**',route=>{const url=new URL(route.request().url());const id=url.pathname.split('/')[3];return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.pathname.endsWith('/orders')?{orders:[]}:{profile:{id,names:[id===ids[0]?'Customer Alpha':'Customer Bravo'],primary_email:null}})});});
    await page.goto(origin+`/customers/${ids[0]}/evidence/new`);await expect(page.locator('[data-runtime-topbar]')).toContainText('Customer Alpha');await expect(page.locator(`[data-runtime-topbar] a[href="/customers/${ids[0]}"]`)).toBeVisible();await capture('evidence-customer-alpha');
    await second.goto(origin+`/customers/${ids[1]}/evidence/new`);await expect(second.locator('[data-runtime-topbar]')).toContainText('Customer Bravo');await expect(page.locator('[data-runtime-topbar]')).toContainText('Customer Alpha');await capture('evidence-customer-bravo-tab',second);
    await page.goto(origin+`/customers/${ids[1]}/evidence/new`);await expect(page.locator('[data-runtime-topbar]')).toContainText('Customer Bravo');await expect(page.locator('[data-runtime-topbar]')).not.toContainText('Customer Alpha');await capture('evidence-customer-sequential');await second.close();
    for(const id of PUBLIC_PLAN_IDS){const plan=PLANS[id];await page.route('**/api/billing',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({planId:id,planName:plan.name,priceGbp:plan.priceGbp,status:'active',totalRemaining:100,usedThisCycle:0,monthlyAllowance:plan.creditsMonthly==='custom'?null:plan.creditsMonthly,currentPeriodEnd:'2026-10-06',cycleResetAt:'2026-10-06',subscriptionIntent:null})}));await page.goto(origin+'/settings/billing?topup=success&checkout=success');await expect(page.getByText(/No credit increase is inferred/)).toBeVisible();await capture(`billing-${id}-return-read-only`);await page.unroute('**/api/billing');}
    expect(mutations).toEqual([]);
    // Purpose-created inactive rule and draft, never published or evaluated.
    ruleId=crypto.randomUUID();versionId=crypto.randomUUID();
    const conditions=[{id:'currency',field:'order_value_usd',operator:'less_than',value:70.25,unit:'USD'},{id:'age',field:'account_age_days',operator:'greater_than',value:3}];
    const base={merchant_id:ACCEPTANCE_MERCHANT_ID,name:`P01 disposable ${ruleId}`,description:'Local no-op roundtrip only',conditions,action:'approve',condition_operator:'or',priority:99998};
    const created=await admin.from('merchant_rules').insert({...base,id:ruleId,is_active:false});if(created.error)throw created.error;
    const version=await admin.from('merchant_rule_versions').insert({...base,id:versionId,merchant_rule_id:ruleId,version:1,status:'draft',created_by:user.id});if(version.error)throw version.error;
    await page.goto(origin+`/controls/rules/${ruleId}`);await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeVisible();await capture('rule-legacy-open');
    // Allow exactly this disposable draft PATCH; the context otherwise blocks mutation.
    await page.route(`**/api/rules/${ruleId}/versions/${versionId}`,route=>route.continue());
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Rule draft saved.',{exact:false}).first()).toBeVisible();
    const readBack=await admin.from('merchant_rule_versions').select('conditions,condition_operator,priority,status').eq('merchant_id',ACCEPTANCE_MERCHANT_ID).eq('id',versionId).single();if(readBack.error)throw readBack.error;
    expect(readBack.data).toEqual({conditions:[{...conditions[0],operator:'lt'},{...conditions[1],operator:'gt'}],condition_operator:'or',priority:99998,status:'draft'});
    fs.writeFileSync(path.join(root,'persisted-rule-roundtrip.json'),JSON.stringify({ruleId,versionId,before:conditions,readBack:readBack.data,externalAction:false},null,2));await capture('rule-no-op-saved');
  }finally{
    const cleanup:any={};
    if(versionId){const r=await admin.from('merchant_rule_versions').delete().eq('merchant_id',ACCEPTANCE_MERCHANT_ID).eq('id',versionId);cleanup.versionError=r.error?.message??null;}
    if(ruleId){const r=await admin.from('merchant_rules').delete().eq('merchant_id',ACCEPTANCE_MERCHANT_ID).eq('id',ruleId);cleanup.ruleError=r.error?.message??null;const remaining=await admin.from('merchant_rules').select('id').eq('merchant_id',ACCEPTANCE_MERCHANT_ID).eq('id',ruleId);cleanup.remainingRules=remaining.data?.length;}
    cleanup.authError=(await auth.auth.signOut({scope:'local'})).error?.message??null;
    await context.close();fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify({records,blockedMutations:mutations,cleanup,environment:'guarded loopback; synthetic browser responses explicitly named; no email/payment/provider action'},null,2));
    expect(cleanup.ruleError??null).toBeNull();expect(cleanup.versionError??null).toBeNull();if(ruleId)expect(cleanup.remainingRules).toBe(0);
  }
});
