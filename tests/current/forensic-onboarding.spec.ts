import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {requireRemainingClosurePlan,authenticateFixture} from './remainingClosureHelpers';

test('Onboarding next actions follow persisted local observations and reload',async({page,context},info)=>{
  const plan=requireRemainingClosurePlan();const fixture=plan.fixtures.workspaceDeletion;
  const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const merchant=await service.from('merchants').select('settings').eq('id',fixture.merchantId).single();expect(merchant.error).toBeNull();
  expect(JSON.stringify(merchant.data!.settings)).toContain(plan.runId);
  async function checked(request:PromiseLike<{error:unknown}>){expect((await request).error).toBeNull();}
  await checked(service.from('merchants').update({settings:{...merchant.data!.settings,platform:'shopify',onboarding_profile_complete:true,setup_complete:false,timezone:'Europe/London'}}).eq('id',fixture.merchantId));
  const external:string[]=[];await context.route(/^https?:\/\//,route=>{const u=new URL(route.request().url());if(['localhost','127.0.0.1'].includes(u.hostname))return route.continue();external.push(u.origin);return route.abort();});
  await page.setViewportSize({width:1024,height:600});await authenticateFixture(page,String(info.project.use.baseURL),fixture,'/onboarding?step=ready');
  const observations:Array<{label:string,url:string}>=[];
  async function task(label:string){await page.goto('/onboarding?step=ready');await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible();observations.push({label,url:page.url()});}
  await task('Connect Shopify');
  await checked(service.from('store_connections').insert({merchant_id:fixture.merchantId,platform:'shopify',store_key:`forensic-${plan.runId}.myshopify.com`,status:'active',credentials_encrypted:'synthetic-local-observation-not-a-provider-token'}));
  await task('Import order history');const jobId=randomUUID();
  await checked(service.from('sync_jobs').insert({id:jobId,merchant_id:fixture.merchantId,job_kind:'initial_import',source:'shopify',status:'failed',total_rows:0,processed_rows:0,failed_rows:0}));await task('Fix import');
  await checked(service.from('sync_jobs').update({status:'running'}).eq('merchant_id',fixture.merchantId).eq('id',jobId));await task('View import progress');
  await checked(service.from('sync_jobs').update({status:'completed'}).eq('merchant_id',fixture.merchantId).eq('id',jobId));await task('Check import coverage');await expect(page.getByText(/0 rows returned/)).toBeVisible();
  await checked(service.from('loss_cases').insert({merchant_id:fixture.merchantId,case_category:'damaged_goods',case_type:'damaged',recovery_route:'needs_more_evidence',currency:'GBP'}));await task('Review imported losses');
  const caseId=randomUUID();await checked(service.from('support_payout_cases').insert({id:caseId,merchant_id:fixture.merchantId,claim_type:'damaged',status:'pending',detection_method:'manual',manual_reference:'FORENSIC-ONBOARDING',currency:'GBP',amount_at_risk:12}));await task('Review your first case');
  await checked(service.from('sync_jobs').update({status:'failed',total_rows:2,processed_rows:1,failed_rows:1}).eq('merchant_id',fixture.merchantId).eq('id',jobId));await task('Review your first case');
  await page.mouse.wheel(0,10000);await expect(page.getByRole('button',{name:'Review your first case',exact:true})).toBeInViewport();await page.screenshot({path:info.outputPath('onboarding-partial-usable.png')});
  await page.getByRole('button',{name:'Review your first case',exact:true}).click();await expect(page).toHaveURL(new URL(`/cases/${caseId}`,String(info.project.use.baseURL)).toString());expect(external).toEqual([]);
  await info.attach('onboarding-persisted-observations',{body:JSON.stringify({merchantId:fixture.merchantId,observations,noProviderRequests:true,scope:'Seven persisted local observation classes, reload, and final Cases destination. Synthetic connection metadata does not prove provider connectivity.'}),contentType:'application/json'});
});
